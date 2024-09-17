/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative, ReporterTestable } from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher, Forms } from "@webpack/common";

const Native = VencordNative.pluginHelpers.AppleMusicRichPresence as PluginNative<typeof import("./native")>;

interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface ActivityButton {
    label: string;
    url: string;
}

interface Activity {
    state?: string;
    details?: string;
    timestamps?: {
        start?: number;
        end?: number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: number;
    flags: number;
}

const enum ActivityType {
    PLAYING = 0,
    LISTENING = 2,
}

const enum ActivityFlag {
    INSTANCE = 1 << 0,
}

export interface TrackData {
    name: string;
    album?: string;
    artist?: string;

    appleMusicLink?: string;
    songLink?: string;

    albumArtwork?: string;
    artistArtwork?: string;

    playerPosition?: number;
    duration?: number;
}

const enum AssetImageType {
    Album = "Album",
    Artist = "Artist",
    Disabled = "Disabled"
}

const applicationId = "1239490006054207550";

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "AppleMusic",
    });
}

const settings = definePluginSettings({
    activityType: {
        type: OptionType.SELECT,
        description: "Which type of activity",
        options: [
            { label: "Playing", value: ActivityType.PLAYING, default: true },
            { label: "Listening", value: ActivityType.LISTENING }
        ],
    },
    refreshInterval: {
        type: OptionType.SLIDER,
        description: "The interval between activity refreshes (seconds)",
        markers: [1, 2, 2.5, 3, 5, 10, 15],
        default: 5,
        restartNeeded: true,
    },
    enableTimestamps: {
        type: OptionType.BOOLEAN,
        description: "Whether or not to enable timestamps",
        default: true,
    },
    enableButtons: {
        type: OptionType.BOOLEAN,
        description: "Whether or not to enable buttons",
        default: true,
    },
    nameString: {
        type: OptionType.STRING,
        description: "Activity name format string",
        default: "Apple Music"
    },
    detailsString: {
        type: OptionType.STRING,
        description: "Activity details format string",
        default: "{name}"
    },
    stateString: {
        type: OptionType.STRING,
        description: "Activity state format string",
        default: "{artist} · {album}"
    },
    largeImageType: {
        type: OptionType.SELECT,
        description: "Activity assets large image type",
        options: [
            { label: "Album artwork", value: AssetImageType.Album, default: true },
            { label: "Artist artwork", value: AssetImageType.Artist },
            { label: "Disabled", value: AssetImageType.Disabled }
        ],
    },
    largeTextString: {
        type: OptionType.STRING,
        description: "Activity assets large text format string",
        default: "{album}"
    },
    smallImageType: {
        type: OptionType.SELECT,
        description: "Activity assets small image type",
        options: [
            { label: "Album artwork", value: AssetImageType.Album },
            { label: "Artist artwork", value: AssetImageType.Artist, default: true },
            { label: "Disabled", value: AssetImageType.Disabled }
        ],
    },
    smallTextString: {
        type: OptionType.STRING,
        description: "Activity assets small text format string",
        default: "{artist}"
    },
});

function customFormat(formatStr: string, data: TrackData) {
    return formatStr
        .replaceAll("{name}", data.name)
        .replaceAll("{album}", data.album ?? "")
        .replaceAll("{artist}", data.artist ?? "");
}

function getImageAsset(type: AssetImageType, data: TrackData) {
    const source = type === AssetImageType.Album
        ? data.albumArtwork
        : data.artistArtwork;

    if (!source) return undefined;

    return ApplicationAssetUtils.fetchAssetIds(applicationId, [source]).then(ids => ids[0]);
}

export default definePlugin({
    name: "AppleMusicRichPresence",
    description: "Discord rich presence for your Apple Music!",
    authors: [Devs.RyanCaoDev],
    hidden: !navigator.platform.startsWith("Mac"),
    reporterTestable: ReporterTestable.None,

    settingsAboutComponent() {
        return <>
            <Forms.FormText>
                For the customizable activity format strings, you can use several special strings to include track data in activities!{" "}
                <code>{"{name}"}</code> is replaced with the track name; <code>{"{artist}"}</code> is replaced with the artist(s)' name(s); and <code>{"{album}"}</code> is replaced with the album name.
            </Forms.FormText>
        </>;
    },

    settings,

    start() {
        this.updatePresence();
        this.updateInterval = setInterval(() => { this.updatePresence(); }, settings.store.refreshInterval * 1000);
    },

    stop() {
        clearInterval(this.updateInterval);
        FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null });
    },

    updatePresence() {
        this.getActivity().then(activity => { setActivity(activity); });
    },

    async getActivity(): Promise<Activity | null> {
        const trackData = await Native.fetchTrackData();
        if (!trackData) return null;

        const [largeImageAsset, smallImageAsset] = await Promise.all([
            getImageAsset(settings.store.largeImageType, trackData),
            getImageAsset(settings.store.smallImageType, trackData)
        ]);

        const assets: ActivityAssets = {};

        const isRadio = Number.isNaN(trackData.duration) && (trackData.playerPosition === 0);

        if (settings.store.largeImageType !== AssetImageType.Disabled) {
            assets.large_image = largeImageAsset;
            if (!isRadio) assets.large_text = customFormat(settings.store.largeTextString, trackData);
        }

        if (settings.store.smallImageType !== AssetImageType.Disabled) {
            assets.small_image = smallImageAsset;
            if (!isRadio) assets.small_text = customFormat(settings.store.smallTextString, trackData);
        }

        const buttons: ActivityButton[] = [];

        if (settings.store.enableButtons) {
            if (trackData.appleMusicLink)
                buttons.push({
                    label: "Listen on Apple Music",
                    url: trackData.appleMusicLink,
                });

            if (trackData.songLink)
                buttons.push({
                    label: "View on SongLink",
                    url: trackData.songLink,
                });
        }

        return {
            application_id: applicationId,

            name: customFormat(settings.store.nameString, trackData),
            details: customFormat(settings.store.detailsString, trackData),
            state: isRadio ? undefined : customFormat(settings.store.stateString, trackData),

            timestamps: (trackData.playerPosition && trackData.duration && settings.store.enableTimestamps) ? {
                start: Date.now() - (trackData.playerPosition * 1000),
                end: Date.now() - (trackData.playerPosition * 1000) + (trackData.duration * 1000),
            } : undefined,

            assets,

            buttons: !isRadio && buttons.length ? buttons.map(v => v.label) : undefined,
            metadata: !isRadio && buttons.length ? { button_urls: buttons.map(v => v.url) } : undefined,

            type: settings.store.activityType,
            flags: ActivityFlag.INSTANCE,
        };
    }
});
