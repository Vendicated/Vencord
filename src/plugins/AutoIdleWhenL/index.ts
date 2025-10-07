/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let originalStatus: string | null = null;

const statusSetting = getUserSettingLazy("status", "status")!;

const settings = definePluginSettings({
    targetStatus: {
        type: OptionType.SELECT,
        description: "Status to display during music playback",
        options: [
            { label: "Online", value: "online" },
            { label: "Idle", value: "idle", default: true },
            { label: "Do Not Disturb", value: "dnd" },
            { label: "Invisible", value: "invisible" }
        ]
    },
    onlineOnly: {
        type: OptionType.BOOLEAN,
        description: "Only modify status if currently online",
        default: true
    }
});

export default definePlugin({
    name: "AutoDNDWhileListening",
    description: "Automatically changes your status during music playback",
    authors: [Devs.enqvy],
    settings,

    flux: {
        SPOTIFY_PLAYER_STATE({ isPlaying }: { isPlaying: boolean }) {
            const currentStatus = statusSetting.getSetting();

            if (isPlaying) {
                if (originalStatus === null) {
                    originalStatus = currentStatus;
                }

                const shouldChangeStatus =
                    !settings.store.onlineOnly ||
                    currentStatus === "online";

                if (shouldChangeStatus && currentStatus !== settings.store.targetStatus) {
                    statusSetting.updateSetting(settings.store.targetStatus);
                }
            }
            else if (originalStatus !== null) {
                if (statusSetting.getSetting() !== originalStatus) {
                    statusSetting.updateSetting(originalStatus);
                }
                originalStatus = null;
            }
        }
    },

    stop() {
        if (originalStatus !== null) {
            statusSetting.updateSetting(originalStatus);
            originalStatus = null;
        }
    }
});
