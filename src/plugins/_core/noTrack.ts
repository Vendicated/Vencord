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
import { Flux, FluxDispatcher, RestAPI } from "@webpack/common";

interface AnalyticsEvent {
    type: string;
    properties: Record<string, unknown>;
}

const settings = definePluginSettings({
    disableAnalytics: {
        type: OptionType.BOOLEAN,
        description: "Block Discord's tracking analytics. Badge progress (eg: hours played) is still tracked if 'Allow Badge Tracking' is enabled in NoTrack settings.",
        default: true,
        restartNeeded: true
    },
    allowBadgeTracking: {
        type: OptionType.BOOLEAN,
        description: "Still send the events Discord needs to track badge progress (games played, hours played, hours streamed)",
        default: true,
        restartNeeded: true,
        disabled: () => !settings.store.disableAnalytics
    }
});

const gameEvents = new Set(["launch_game", "running_game_heartbeat"]);
const streamEvents = new Set(["media_session_joined", "video_stream_started", "video_stream_ended"]);

const anonymizedProperties: Record<string, unknown> = {
    accessibility_features: 0,
    activity_status_shared_guilds: [],
    client_performance_cpu: null,
    client_performance_memory: null,
    cpu_core_count: null,
    voice_channel_bitrate: null,
    voice_channel_guild_id: null,
    voice_channel_id: null,
    voice_channel_type: null
};

const omittedPropertyPrefixes = ["client_viewport_", "discord_memory_pct_", "system_cpu_pct_", "system_memory_pct_"];

export default definePlugin({
    name: "NoTrack",
    description: "Disable Discord's tracking (analytics/'science'), metrics and Sentry crash reporting",
    authors: [Devs.Cyn, Devs.Ven, Devs.Nuckyz, Devs.Arrow, Devs.Cramber],
    required: true,

    settings,

    patches: [
        {
            find: "AnalyticsActionHandlers.handle",
            predicate: () => settings.store.disableAnalytics,
            replacement: {
                match: /\(0,(\i)\.analyticsTrackingStoreMaker\)\(/,
                replace: "$self.analyticsTrackingStoreMaker($1.analyticsTrackingStoreMaker,",
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

    isBadgeEvent({ type, properties }: AnalyticsEvent) {
        if (gameEvents.has(type)) return true;

        return streamEvents.has(type) && properties.context === "stream" && properties.participant_type !== "receiver";
    },

    anonymize(properties: Record<string, unknown>) {
        const anonymized = { ...properties };

        for (const key in anonymized) {
            if (omittedPropertyPrefixes.some(prefix => key.startsWith(prefix))) {
                delete anonymized[key];
            } else if (Object.hasOwn(anonymizedProperties, key)) {
                anonymized[key] = anonymizedProperties[key];
            }
        }

        return anonymized;
    },

    submitBadgeEvents(url: string, events: AnalyticsEvent[], token: string) {
        const allowedEvents = events
            .filter(event => this.isBadgeEvent(event))
            .map(event => ({ ...event, properties: this.anonymize(event.properties) }));

        if (!allowedEvents.length) return Promise.resolve();

        return RestAPI.post({ url, body: { token, events: allowedEvents } });
    },

    analyticsTrackingStoreMaker(makeStore: (options: any) => any, options: any) {
        if (settings.store.allowBadgeTracking) {
            if (String(makeStore).includes("submitEvents")) {
                return makeStore({
                    ...options,
                    submitEvents: (events: AnalyticsEvent[], token: string) => this.submitBadgeEvents(options.TRACKING_URL, events, token)
                });
            }

            new Logger("NoTrack", "#8caaee").error("Failed to allow badge tracking, blocking all analytics instead");
        }

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
