/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { WebpackRequire } from "@vencord/discord-types/webpack";
import { Flux, FluxDispatcher } from "@webpack/common";

const settings = definePluginSettings({
    disableAnalytics: {
        type: OptionType.BOOLEAN,
        description: "Disable Discord's tracking (analytics/'science')",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "NoTrack",
    description: "Disable Discord's analytics, metrics and crash reporting, randomize tracking IDs, and hide optional client metadata",
    authors: [Devs.Cyn, Devs.Ven, Devs.Nuckyz, Devs.Arrow, Devs.rot],
    required: true,

    settings,

    patches: [
        {
            find: "X-Super-Properties",
            all: true,
            replacement: {
                match: /("X-Super-Properties"(?:,|\]=|:))(\i)/g,
                replace: "$1$self.randomizeSuperProperties($2)"
            }
        },
        {
            find: "this.emit(\"send-message\",",
            replacement: {
                match: /JSON\.stringify\((\{op:\i,d:\i\})\)/,
                replace: "JSON.stringify($self.randomizeGatewayPayload($1))"
            }
        },
        {
            find: "X-Installation-ID",
            all: true,
            replacement: {
                match: /("X-Installation-ID"(?:,|\]=|:))\i/g,
                replace: "$1$self.getInstallationId()"
            }
        },
        {
            find: "getInstallationForTracking(){",
            replacement: {
                match: /getInstallationForTracking\(\)\{[^}]*\}/,
                replace: "getInstallationForTracking(){return $self.getInstallationId()}"
            }
        },
        {
            find: "X-Discord-Timezone",
            all: true,
            replacement: {
                match: /\i\.set\("X-Discord-Timezone",\i\)/g,
                replace: "void 0"
            }
        },
        {
            find: "discord_protos.discord_users.v1.LocalizationSettings",
            replacement: {
                match: /\i\.timezone(?:Offset|Name)&&/g,
                replace: "false&&"
            }
        },
        {
            find: "AnalyticsActionHandlers.handle",
            predicate: () => settings.store.disableAnalytics,
            replacement: {
                match: /\(0,\i\.analyticsTrackingStoreMaker\)/,
                replace: "$self.analyticsTrackingStoreMaker",
            },
        },
        {
            find: ".METRICS_V2",
            replacement: [
                {
                    match: /this\._intervalId=/,
                    replace: "this._intervalId=void 0&&"
                },
                {
                    match: /(?:increment|distribution)\(\i(?:,\i)?\){/g,
                    replace: "$&return;"
                }
            ]
        },
        {
            find: ".BetterDiscord||null!=",
            replacement: {
                // Make hasClientMods return false
                match: /(?=let \i=window;)/,
                replace: "return false;"
            }
        }
    ],

    randomizeTrackingProperties(properties: Record<string, unknown>) {
        // Keep client and build fields, drop optional metadata
        const result: Record<string, unknown> = {};
        for (const key of ["os", "browser", "release_channel", "client_version", "client_build_number", "native_build_number", "client_event_source", "is_fast_connect"]) {
            if (Object.hasOwn(properties, key)) result[key] = properties[key];
        }

        for (const key of ["client_launch_id", "client_heartbeat_session_id", "launch_signature", "client_uuid"]) {
            if (properties[key] != null) result[key] = crypto.randomUUID();
        }

        if (properties.installation_id != null) result.installation_id = this.getInstallationId();
        if (Object.hasOwn(properties, "has_client_mods")) result.has_client_mods = false;
        return result;
    },

    randomizeSuperProperties(encoded: string) {
        try {
            const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
            const properties = JSON.parse(new TextDecoder().decode(bytes));
            if (properties == null || typeof properties !== "object" || Array.isArray(properties)) return "e30=";

            const json = JSON.stringify(this.randomizeTrackingProperties(properties));
            return btoa(String.fromCharCode(...new TextEncoder().encode(json)));
        } catch {
            return "e30=";
        }
    },

    randomizeGatewayPayload(packet: { op: number; d: unknown; }) {
        if (packet.d == null || typeof packet.d !== "object" || Array.isArray(packet.d)) return packet;
        const data = packet.d as Record<string, unknown>;

        switch (packet.op) {
            case 2: {
                const { properties } = data;
                if (properties == null || typeof properties !== "object" || Array.isArray(properties)) return packet;
                return { ...packet, d: { ...data, properties: this.randomizeTrackingProperties(properties as Record<string, unknown>) } };
            }
            case 40: // Replace QoS heartbeats with regular heartbeats.
                return { op: 1, d: data.seq };
            case 41: // These telemetry IDs are separate from the Gateway resume session.
                return {
                    ...packet,
                    d: { ...data, initialization_timestamp: 0, session_id: crypto.randomUUID(), client_launch_id: crypto.randomUUID() }
                };
            default:
                return packet;
        }
    },

    getInstallationId() {
        // Match Discord's snowflake.signature format.
        const bytes = crypto.getRandomValues(new Uint8Array(28));
        const id = new DataView(bytes.buffer).getBigUint64(0).toString();
        const signature = btoa(String.fromCharCode(...bytes.subarray(8)))
            .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
        return `${id}.${signature}`;
    },

    // The TRACK event takes an optional `resolve` property that is called when the tracking event was submitted to the server.
    // A few spots in Discord await this callback before continuing (most notably the Voice Debug Logging toggle).
    // Since we NOOP the AnalyticsActionHandlers module, there is no handler for the TRACK event, so we have to handle it ourselves
    flux: {
        TRACK(event) {
            event?.resolve?.();
        }
    },

    startAt: StartAt.Init,
    start() {
        // Disable fast-connect, its separate bundle bypasses our Gateway patch.
        const earlySocket = (window as Window & { _ws?: { ws?: WebSocket; } | null; })._ws?.ws;
        Object.defineProperty(window, "_ws", {
            configurable: true,
            get: () => null,
            set(value: { ws?: WebSocket; } | null) {
                value?.ws?.close(1000);
            }
        });
        earlySocket?.close(1000);

        // Sentry is initialized in its own WebpackInstance.
        // It has everything it needs preloaded, so, it doesn't include any chunk loading functionality.
        // Because of that, its WebpackInstance doesnt export wreq.m or wreq.c

        // To circuvent this and disable Sentry we are gonna hook when wreq.d of its WebpackInstance is set.
        // When that happens we are gonna forcefully throw an error and abort everything.
        Object.defineProperty(Function.prototype, "d", {
            configurable: true,

            set(this: WebpackRequire, esmDeclareFunc: WebpackRequire["d"]) {
                Object.defineProperty(this, "d", {
                    value: esmDeclareFunc,
                    configurable: true,
                    enumerable: true,
                    writable: true
                });

                // Ensure this is most likely the Sentry WebpackInstance.
                // Function.g is a very generic property and is not uncommon for another WebpackInstance (or even a React component: <g></g>) to include it
                const { stack } = new Error();
                if (this.c != null || !stack?.includes("http") || !String(this).includes("exports:{}")) {
                    return;
                }

                const assetPath = stack.match(/http.+?(?=:\d+?:\d+?$)/m)?.[0];
                if (!assetPath) {
                    return;
                }

                const srcRequest = new XMLHttpRequest();
                srcRequest.open("GET", assetPath, false);
                srcRequest.send();

                // Final condition to see if this is the Sentry WebpackInstance
                // This is matching window.DiscordSentry=, but without `window` to avoid issues on some proxies
                if (!srcRequest.responseText.includes(".DiscordSentry=")) {
                    return;
                }

                new Logger("NoTrack", "#8caaee").info("Disabling Sentry by erroring its WebpackInstance");

                Reflect.deleteProperty(Function.prototype, "d");
                Reflect.deleteProperty(window, "DiscordSentry");

                throw new Error("Sentry successfully disabled");
            }
        });

        Object.defineProperty(window, "DiscordSentry", {
            configurable: true,

            set() {
                new Logger("NoTrack", "#8caaee").error("Failed to disable Sentry. Falling back to deleting window.DiscordSentry");

                Reflect.deleteProperty(Function.prototype, "d");
                Reflect.deleteProperty(window, "DiscordSentry");
            }
        });
    },

    analyticsTrackingStoreMaker() {
        class AnalyticsTrackingStoreStub extends Flux.Store {
            static displayName = "AnalyticsTrackingStore";

            requestDrain() { }

            async submitEventsImmediately() {
                // This is supposed to return a Discord rest response but we can't know what the correct shape would be, because
                // 1. It's not used anywhere
                // 2. It takes a dynamic url
                // Instead we throw an error with the same structure as a Discord rest error which they probably should handle gracefully.
                // Discord also throws a plain object instead of Error class

                throw {
                    ok: false,
                    status: 500,
                    body: {
                        message: "Analytics tracking is disabled by NoTrack",
                        code: 0
                    },
                    headers: {},
                    text: JSON.stringify({
                        message: "Analytics tracking is disabled by NoTrack",
                        code: 0
                    })
                };
            }
        }

        return new AnalyticsTrackingStoreStub(FluxDispatcher);
    }
});
