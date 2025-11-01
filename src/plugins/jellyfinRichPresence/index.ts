/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 sprouts
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

import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Logger } from "@utils/Logger";
import { definePluginSettings } from "@api/Settings";
import { Alerts, ApplicationAssetUtils, FluxDispatcher } from "@webpack/common";
import { ActivityFlags } from "@vencord/discord-types/enums";
import { relaunch } from "@utils/native";
import { showNotification } from "@api/Notifications";
import handlers from "./handlers";

const logger = new Logger("JellyfinRichPresence");
const settings = definePluginSettings({
    // Server
    jellyfinURL: {
        description: "i.e. https://example.com",
        type: OptionType.STRING,
        restartNeeded: true,
    },
    jellyfinAPIKey: {
        description: "Find this in Dashboard > API Keys (you must be an administrator of your server)",
        type: OptionType.STRING,
    },
    jellyfinUsername: {
        description: "Username to get sessions for",
        type: OptionType.STRING,
    },

    // Items
    audio: {
        description: "Should Audio be displayed on your profile?",
        type: OptionType.BOOLEAN,
        default: true,
    },
    movies: {
        description: "Should Movies be displayed on your profile?",
        type: OptionType.BOOLEAN,
        default: true,
    },

    // API
    tmdbAPIKey: {
        description: "For movie covers",
        type: OptionType.STRING,
        restartNeeded: true,
    },

    // Discord
    applicationID: {
        description: "Where to fetch assets from",
        type: OptionType.STRING,
        default: "1433957762437742722"
    },
    applicationName: {
        description: "What to call the application",
        type: OptionType.STRING,
        default: "Jellyfin",
    },
    updateTime: {
        description: "Time between status updates, in seconds",
        type: OptionType.NUMBER,
        default: 10,
        restartNeeded: true,
    },
});

export default definePlugin({
    name: "JellyfinRichPresence",
    description: "Rich presence for your Jellyfin instance",
    authors: [Devs.sprouts],

    start() {
        if (settings.store.jellyfinURL) {
            this.confirmCSPOverride(settings.store.jellyfinURL, () => {
                this.updateInterval = setInterval(() => this.update(), Math.max(settings.store.updateTime, 10) * 1000);
                this.update();
            });
        }
    },

    stop() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            socketId: "Jellyfin",
            activity: null,
        });
    },

    settings,

    async confirmCSPOverride(url, callback) {
        if (await VencordNative.csp.isDomainAllowed(url, ["connect-src"])) {
            callback();
        } else {
            const userResponse = await VencordNative.csp.requestAddOverride(url, ["connect-src"], "Jellyfin Rich Presence");

            if (userResponse === "ok") {
                Alerts.show({
                    title: "Jellyfin server added",
                    body: `${url} has been added to the whitelist. Please restart the app for the changes to take effect.`,
                    confirmText: "Restart now",
                    cancelText: "Later!",
                    onConfirm: relaunch,
                });

            } else {
                showNotification({
                    title: "Failed to start Jellyfin Rich Presence",
                    body: "You must allow Discord to connect to your Jellyfin server! Please restart the app to try again.",
                    color: "var(--red-360)",
                });
            }
        }
    },

    async getSessions() {
        const sessions = await fetch(`${settings.store.jellyfinURL}/Sessions`, {
            headers: {
                Authorization: `MediaBrowser Token="${settings.store.jellyfinAPIKey}"`
            },
        }).then(response => response.json());

        return sessions.filter(session => {
            if (session.UserName !== settings.store.jellyfinUsername) return false;
            if (session.PlayState.IsPaused) return false;

            const item = session.NowPlayingItem;
            if (!item) return false;
            if (item.Type === "Audio" && !settings.store.audio) return false;
            if (item.Type === "Movie" && !settings.store.movies) return false;

            return true;
        });
    },

    imageCache: {},
    async buildActivity(session) {
        const item = session.NowPlayingItem;
        const handler = handlers[item.Type];

        if (handler) {
            const result = handler.getActivity(item, settings);

            let imageURL = this.imageCache[item.Id];
            if (!imageURL) {
                try {
                    imageURL = await handler.getImage(item, settings);
                } catch (error) {
                    logger.error(`Failed to fetch image for ${item.Name}`, error);
                    imageURL = null;
                }
                this.imageCache[item.Id] = imageURL;
            }

            const startTime = Date.now() - session.PlayState.PositionTicks / 10000;
            const endTime = startTime + item.RunTimeTicks / 10000;

            const [imageAsset] = await ApplicationAssetUtils.fetchAssetIds(settings.store.applicationID, [imageURL ?? handler.icon]);

            return {
                application_id: settings.store.applicationID,
                flags: ActivityFlags.INSTANCE,

                name: settings.store.applicationName,
                type: result.type,
                status_display_type: result.statusType,
                details: result.details,
                details_url: result.detailsURL,
                state: result.state,
                state_url: result.stateURL,
                timestamps: { start: startTime, end: endTime },
                assets: {
                    large_image: imageAsset,
                    large_text: result.image ?? null,
                    small_image: null,
                    small_text: null,
                },
            };
        } else {
            return null;
        }
    },

    async update() {
        if (!settings.store.jellyfinURL) return;
        if (!settings.store.jellyfinAPIKey) return;
        if (!settings.store.jellyfinUsername) return;

        const sessions = await this.getSessions();

        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            socketId: "Jellyfin",
            activity: sessions.length > 0 ? await this.buildActivity(sessions[0]) : null,
        });
    },
});
