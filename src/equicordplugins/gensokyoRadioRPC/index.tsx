/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Paragraph } from "@components/Paragraph";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative, ReporterTestable } from "@utils/types";
import { Activity } from "@vencord/discord-types";
import { ActivityFlags, ActivityType } from "@vencord/discord-types/enums";
import { ApplicationAssetUtils, FluxDispatcher } from "@webpack/common";

const Native = VencordNative.pluginHelpers.GensokyoRadioRPC as PluginNative<typeof import("./native")>;

const applicationId = "1253772057926303804";

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "GensokyoRadio",
    });
}

function getImageAsset(data: string) {
    return ApplicationAssetUtils.fetchAssetIds(applicationId, [data]).then(ids => ids[0]);
}

const settings = definePluginSettings({
    refreshInterval: {
        type: OptionType.SLIDER,
        description: "The interval between activity refreshes (seconds)",
        markers: [1, 2, 2.5, 3, 5, 10, 15],
        default: 15,
        restartNeeded: true,
    }
});

let updateInterval: NodeJS.Timeout | undefined;

export default definePlugin({
    name: "GensokyoRadioRPC",
    description: "Discord rich presence for Gensokyo Radio!",
    authors: [Devs.RyanCaoDev, EquicordDevs.Prince527],
    reporterTestable: ReporterTestable.None,

    settingsAboutComponent() {
        return (
            <Paragraph>
                Discord rich presence for Gensokyo Radio!
            </Paragraph>
        );
    },

    settings,

    start() {
        this.updatePresence();
        updateInterval = setInterval(() => { this.updatePresence(); }, settings.store.refreshInterval * 1000);
    },

    stop() {
        clearInterval(updateInterval);
        updateInterval = undefined;
        FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null });
    },

    updatePresence() {
        this.getActivity().then(activity => { setActivity(activity); });
    },

    async getActivity(): Promise<Activity | null> {
        const trackData = await Native.fetchTrackData();
        if (!trackData) return null;

        return {
            application_id: applicationId,

            name: "Gensokyo Radio",
            details: trackData.title,
            state: trackData.artist,

            timestamps: {
                // start: Date.now() - (trackData.position * 1000),
                start: trackData.position * 1000,
                // end: Date.now() - (trackData.position * 1000) + (trackData.duration * 1000),
                end: trackData.duration * 1000,
            },

            assets: {
                large_image: await getImageAsset(trackData.artwork),
                large_text: trackData.album,
                small_image: await getImageAsset("logo"),
                small_text: "Gensokyo Radio"
            },

            buttons: undefined,
            metadata: { button_urls: undefined },

            type: ActivityType.LISTENING,
            flags: ActivityFlags.INSTANCE,
        };
    }
});
