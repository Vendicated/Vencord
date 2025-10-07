/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let savedStatus: string | null;

const StatusSettings = getUserSettingLazy<string>("status", "status")!;

const settings = definePluginSettings({
    statusToSet: {
        type: OptionType.SELECT,
        description: "Status to set while listening to music",
        options: [
            {
                label: "Online",
                value: "online",
            },
            {
                label: "Idle",
                value: "idle",
                default: true
            },
            {
                label: "Do Not Disturb",
                value: "dnd",
            },
            {
                label: "Invisible",
                value: "invisible",
            }
        ]
    },
    onlyChangeWhenOnline: {
        type: OptionType.BOOLEAN,
        description: "Only change status to idle when current status is online",
        default: true,
    }
});

export default definePlugin({
    name: "AutoDNDWhileListening",
    description: "Automatically updates your online status (online, idle, dnd) when listening to music",
    authors: [Devs.enqvy],
    settings,
    flux: {
        SPOTIFY_PLAYER_STATE({ isPlaying }) {
            const status = StatusSettings.getSetting();

            if (isPlaying) {
                // Check the new setting before changing status
                if (
                    (!settings.store.onlyChangeWhenOnline || status === "online") &&
                    status !== settings.store.statusToSet
                ) {
                    savedStatus = status;
                    StatusSettings.updateSetting(settings.store.statusToSet);
                }
            } else if (savedStatus && savedStatus !== settings.store.statusToSet) {
                StatusSettings.updateSetting(savedStatus);
            }
        }
    }
});
