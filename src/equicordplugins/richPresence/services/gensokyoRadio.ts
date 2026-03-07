/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { PluginNative } from "@utils/types";
import { Activity } from "@vencord/discord-types";
import { ActivityFlags, ActivityType } from "@vencord/discord-types/enums";
import { ApplicationAssetUtils, FluxDispatcher } from "@webpack/common";

import { settings } from "../settings";

const Native = VencordNative.pluginHelpers.RichPresence as PluginNative<typeof import("../native")>;
const logger = new Logger("RichPresence:GensokyoRadio");

const APPLICATION_ID = "1253772057926303804";
const SOCKET_ID = "RichPresence_GR";

let updateInterval: NodeJS.Timeout | undefined;

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity, socketId: SOCKET_ID });
}

async function getAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(APPLICATION_ID, [key]))[0];
}

async function getActivity(): Promise<Activity | null> {
    const trackData = await Native.fetchTrackData();
    if (!trackData) return null;

    return {
        application_id: APPLICATION_ID,
        name: "Gensokyo Radio",
        details: trackData.title,
        state: trackData.artist,
        timestamps: {
            start: trackData.position * 1000,
            end: trackData.duration * 1000,
        },
        assets: {
            large_image: await getAsset(trackData.artwork),
            large_text: trackData.album,
            small_image: await getAsset("logo"),
            small_text: "Gensokyo Radio",
        },
        type: ActivityType.LISTENING,
        flags: ActivityFlags.INSTANCE,
    };
}

async function updatePresence() {
    try {
        setActivity(await getActivity());
    } catch (e) {
        logger.error("Failed to update presence", e);
        setActivity(null);
    }
}

export function start() {
    updatePresence();
    updateInterval = setInterval(updatePresence, (settings.store.gr_refreshInterval ?? 15) * 1000);
}

export function stop() {
    clearInterval(updateInterval);
    updateInterval = undefined;
    setActivity(null);
}
