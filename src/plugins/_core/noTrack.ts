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
    description: "Disable Discord's tracking (analytics/'science'), metrics and Sentry crash reporting",
    authors: [Devs.Cyn, Devs.Ven, Devs.Nuckyz, Devs.Arrow],
    required: true,

    settings,

    patches: [
        {
            find: "AnalyticsActionHandlers.handle",
            predicate: () => settings.store.disableAnalytics,
            replacement: {
                match: /^.+$/,
                replace: "()=>{}",
            },
        },
        {
            find: ".METRICS",
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

    startAt: StartAt.Init,
    start() {
        // Sentry is initialized in its own WebpackInstance.
        // It has everything it needs preloaded, so, it doesn't include any chunk loading functionality.
        // Because of that, its WebpackInstance doesnt export wreq.m or wreq.c

        // To circuvent this and disable Sentry we are gonna hook when wreq.g of its WebpackInstance is set.
        // When that happens we are gonna forcefully throw an error and abort everything.
        Object.defineProperty(Function.prototype, "g", {
            configurable: true,

            set(v: any) {
                Object.defineProperty(this, "g", {
                    value: v,
                    configurable: true,
                    enumerable: true,
                    writable: true
                });

                // Ensure this is most likely the Sentry WebpackInstance.
                // Function.g is a very generic property and is not uncommon for another WebpackInstance (or even a React component: <g></g>) to include it
                const { stack } = new Error();
                if (!(stack?.includes("discord.com") || stack?.includes("discordapp.com")) || !String(this).includes("exports:{}") || this.c != null) {
                    return;
                }

                const assetPath = stack?.match(/\/assets\/.+?\.js/)?.[0];
                if (!assetPath) {
                    return;
                }

                const srcRequest = new XMLHttpRequest();
                srcRequest.open("GET", assetPath, false);
                srcRequest.send();

                // Final condition to see if this is the Sentry WebpackInstance
                if (!srcRequest.responseText.includes("window.DiscordSentry=")) {
                    return;
                }

                new Logger("NoTrack", "#8caaee").info("Disabling Sentry by erroring its WebpackInstance");

                Reflect.deleteProperty(Function.prototype, "g");
                Reflect.deleteProperty(window, "DiscordSentry");

                throw new Error("Sentry successfully disabled");
            }
        });

        Object.defineProperty(window, "DiscordSentry", {
            configurable: true,

            set() {
                new Logger("NoTrack", "#8caaee").error("Failed to disable Sentry. Falling back to deleting window.DiscordSentry");

                Reflect.deleteProperty(Function.prototype, "g");
                Reflect.deleteProperty(window, "DiscordSentry");
            }
        });
    }
});
