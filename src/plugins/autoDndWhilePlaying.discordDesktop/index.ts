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
        description: "Status to set while playing a game",
        options: [
            {
                label: "Online",
                value: "online",
            },
            {
                label: "Idle",
                value: "idle",
            },
            {
                label: "Do Not Disturb",
                value: "dnd",
                default: true
            },
            {
                label: "Invisible",
                value: "invisible",
            }
        ]
    }
});

export default definePlugin({
    name: "AutoDNDWhilePlaying",
    description: "Automatically updates your online status (online, idle, dnd) when launching games",
    authors: [Devs.thororen],
    settings,
    flux: {
        RUNNING_GAMES_CHANGE({ games }) {
            const status = StatusSettings.getSetting();

            if (games.length > 0) {
                if (status !== settings.store.statusToSet) {
                    savedStatus = status;
                    StatusSettings.updateSetting(settings.store.statusToSet);
                }
            } else if (savedStatus && savedStatus !== settings.store.statusToSet) {
                StatusSettings.updateSetting(savedStatus);
            }
        }
    }
});
