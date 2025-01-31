/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher } from "@webpack/common";

const applicationId = "1334959762785173567";
const logger = new Logger("MullvadRichPresence");
const Native = VencordNative.pluginHelpers.MullvadRichPresence as PluginNative<typeof import("./native")>;


async function getApplicationAsset(key: string): Promise<string> {
    const assets = await ApplicationAssetUtils.fetchAssetIds(applicationId, [key]);
    return assets.length > 0 ? assets[0] : "";
}

const settings = definePluginSettings({
    activityType: {
        type: OptionType.BOOLEAN,
        description: "Show the Mullvad server name",
        default: false, // Defaults to false to protect privacy of users that install it.
    },
});

interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface Activity {
    state: string;
    details?: string;
    timestamps?: {
        start?: number;
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

let connectionStartTimestamp: number | undefined;

async function updateMullvadStatus() {
    try {
        const status = await Native.getMullvadStatus();
        const statusObject = JSON.parse(status);

        if (!statusObject || !statusObject.state) {
            logger.error("Invalid Mullvad status format. Missing expected fields.");
            return;
        }

        const isConnected = statusObject.state === "connected";

        console.log(statusObject);

        let city = "Not Connected";
        let country = "";
        let tunnelType = "N/A";
        let hostName = "";

        if (isConnected && statusObject.details) {
            const { location, endpoint } = statusObject.details;

            city = location?.city || "Unknown Location";
            country = location?.country || "Unknown Country";
            hostName = location?.hostname || "Unknown Host";

            const tunnelTypeRaw = endpoint?.tunnel_type || "Unknown Tunnel Type";
            tunnelType = tunnelTypeRaw !== "Unknown Tunnel Type"
                ? tunnelTypeRaw.charAt(0).toUpperCase() + tunnelTypeRaw.slice(1)
                : tunnelTypeRaw;

            if (!connectionStartTimestamp) {
                connectionStartTimestamp = Date.now();
            }
        } else {
            connectionStartTimestamp = undefined;
        }

        await setActivity(isConnected, city, country, tunnelType, hostName);
    } catch (error) {
        logger.error("Error fetching Mullvad status:", error);
    }
}

async function setActivity(isConnected: boolean, city: string, country: string, tunnelType: string, hostName: string) {

    const state = isConnected
        ? `Connected to ${city}, ${country}${settings.store.activityType ? ` (${hostName})` : ""}`
        : "VPN Disconnected";

    const details = `Tunnel Type: ${tunnelType}`;

    const startTimestamp = isConnected ? connectionStartTimestamp : undefined;

    const largeImageKey = await getApplicationAsset("mullvad");
    const smallImageKey = isConnected ? await getApplicationAsset("connected") : await getApplicationAsset("disconnected");

    const activity: Activity = {
        name: "Mullvad VPN",
        state,
        details,
        application_id: applicationId,
        type: ActivityType.PLAYING,
        flags: ActivityFlag.INSTANCE,
        timestamps: {
            start: startTimestamp
        },
        assets: {
            large_image: largeImageKey,
            large_text: "Mullvad VPN",
            small_image: smallImageKey,
            small_text: isConnected ? "Connected" : "Disconnected",
        },
        buttons: [],
    };

    console.log("Setting Discord activity:", activity);

    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "Mullvad",
    });
}

let updateInterval: NodeJS.Timeout | null = null;

export default definePlugin({
    name: "MullvadRichPresence",
    description: "Displays Mullvad VPN status in Discord Rich Presence",
    authors: [Devs.alessandromrc],

    settings,

    start() {
        logger.info("Plugin Started!");

        updateMullvadStatus();
        updateInterval = setInterval(updateMullvadStatus, 60000);
    },

    stop() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
        FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null });
    },
});
