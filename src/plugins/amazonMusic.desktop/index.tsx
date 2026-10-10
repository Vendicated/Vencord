/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors 
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs, IS_MAC, IS_WINDOWS } from "@utils/constants";
import definePlugin, { OptionType, PluginNative, ReporterTestable } from "@utils/types";
import { Activity, ActivityAssets } from "@vencord/discord-types";
import { ActivityFlags, ActivityStatusDisplayType, ActivityType } from "@vencord/discord-types/enums";
import { ApplicationAssetUtils, FluxDispatcher } from "@webpack/common";

const Native = VencordNative.pluginHelpers.AmazonMusicRichPresence as PluginNative<typeof import("./native")>;

export interface TrackData {
    name: string;
    album?: string;
    artist?: string;
    amazonMusicLink?: string;
    albumArtwork?: string;
    playerPosition?: number;
    duration?: number;
}

// official amazon music app id, not mine
const applicationId = "808756700022702120";

let updateInterval: NodeJS.Timeout | null = null;
let lastTrackKey: string | null = null;
let trackStartTime: number | null = null;

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "AmazonMusicRichPresence",
    });
}

const settings = definePluginSettings({
    activityType: {
        type: OptionType.SELECT,
        description: "Which type of activity",
        options: [
            { label: "Listening", value: ActivityType.LISTENING, default: true },
            { label: "Playing", value: ActivityType.PLAYING }
        ],
    },
    statusDisplayType: {
        description: "Show the track / artist name",
        type: OptionType.SELECT,
        options: [
            {
                label: "Don't show (shows generic listening message)",
                value: "off"
            },
            {
                label: "Show artist name",
                value: "artist",
                default: true
            },
            {
                label: "Show track name",
                value: "track"
            }
        ]
    },
    enableTimestamps: {
        type: OptionType.BOOLEAN,
        description: "Whether or not to show duration and track progress",
        default: true,
    },
    showAlbumArt: {
        type: OptionType.BOOLEAN,
        description: "Show high res album artwork",
        default: true,
    },
    showLogo: {
        type: OptionType.BOOLEAN,
        description: "Show small Amazon Music logo on album art",
        default: true,
    },
    enableButtons: {
        type: OptionType.BOOLEAN,
        description: "Show 'Listen on Amazon Music' button",
        default: true,
    }
});

async function getAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(applicationId, [key]))[0];
}

export default definePlugin({
    name: "AmazonMusicRichPresence",
    description: "Discord rich presence for your Amazon Music desktop app!",
    tags: ["Activity", "Media"],
    authors: [Devs.mariontop],
    hidden: !IS_WINDOWS && !IS_MAC,
    reporterTestable: ReporterTestable.None,

    settings,

    start() {
        this.updatePresence();
        updateInterval = setInterval(() => { this.updatePresence(); }, 1000);
    },

    stop() {
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = null;
        lastTrackKey = null;
        trackStartTime = null;
        setActivity(null);
    },

    updatePresence() {
        this.getActivity().then(activity => {
            if (!activity) {
                lastTrackKey = null;
                trackStartTime = null;
            }
            setActivity(activity);
        });
    },

    async getActivity(): Promise<Activity | null> {
        try {
            const trackData = await Native.fetchTrackData();
            if (!trackData || !trackData.name) return null;

            const assets: ActivityAssets = {};
            if (settings.store.showAlbumArt && trackData.albumArtwork) {
                const [largeImage, smallImage] = await Promise.all([
                    getAsset(trackData.albumArtwork).catch(() => getAsset("logo")),
                    settings.store.showLogo ? getAsset("logo").catch(() => undefined) : Promise.resolve(undefined)
                ]);
                assets.large_image = largeImage;
                assets.large_text = trackData.album || trackData.name;
                if (settings.store.showLogo && smallImage) {
                    assets.small_image = smallImage;
                    assets.small_text = "Amazon Music";
                }
            } else {
                assets.large_image = await getAsset("logo").catch(() => undefined);
                assets.large_text = trackData.name;
            }

            const buttons: Array<{ label: string; url: string; }> = [];
            if (settings.store.enableButtons && trackData.amazonMusicLink) {
                buttons.push({
                    label: "Listen on Amazon Music",
                    url: trackData.amazonMusicLink,
                });
            }

            // smtc gives 0 position, keep start time so timer doesnt reset
            const currentTrackKey = `${trackData.name}|${trackData.artist ?? ""}|${trackData.album ?? ""}`;
            if (lastTrackKey !== currentTrackKey || !trackStartTime) {
                lastTrackKey = currentTrackKey;
                trackStartTime = Date.now() - ((trackData.playerPosition || 0) * 1000);
            } else if (typeof trackData.playerPosition === "number" && trackData.playerPosition > 0) {
                const elapsed = (Date.now() - trackStartTime) / 1000;
                if (Math.abs(elapsed - trackData.playerPosition) > 3) {
                    trackStartTime = Date.now() - (trackData.playerPosition * 1000);
                }
            }

            const timestamps = (settings.store.enableTimestamps && trackStartTime) ? {
                start: trackStartTime,
                end: trackData.duration ? trackStartTime + (trackData.duration * 1000) : undefined,
            } : undefined;

            return {
                application_id: applicationId,
                name: "Amazon Music",
                details: trackData.name,
                state: trackData.artist || undefined,
                timestamps,
                assets,
                buttons: buttons.length ? buttons.map(v => v.label) : undefined,
                metadata: buttons.length ? { button_urls: buttons.map(v => v.url) } : undefined,
                type: settings.store.activityType,
                status_display_type: {
                    "off": ActivityStatusDisplayType.NAME,
                    "artist": ActivityStatusDisplayType.STATE,
                    "track": ActivityStatusDisplayType.DETAILS
                }[settings.store.statusDisplayType],
                flags: ActivityFlags.INSTANCE,
            };
        } catch {
            return null;
        }
    }
});
