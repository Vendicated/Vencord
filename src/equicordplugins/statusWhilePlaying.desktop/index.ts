/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { PresenceStore, UserStore } from "@webpack/common";

let savedStatus = "";
const updateAsync = findByCodeLazy("updateAsync", "status");
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
    name: "StatusWhilePlaying",
    description: "Automatically updates your online status (online, idle, dnd) when launching games",
    authors: [EquicordDevs.thororen],
    settings,
    flux: {
        RUNNING_GAMES_CHANGE(event) {
            const status = PresenceStore.getStatus(UserStore.getCurrentUser().id);
            if (event.games.length > 0) {
                if (status !== settings.store.statusToSet) {
                    savedStatus = status;
                    updateAsync(settings.store.statusToSet);
                }
            } else {
                if (savedStatus !== "" && savedStatus !== settings.store.statusToSet)
                    updateAsync(savedStatus);
            }
        },
    }
});
