/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { FluxDispatcher, PresenceStore, UserStore } from "@webpack/common";

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
    authors: [Devs.thororen],
    settings,
    flux: {
    	RUNNING_GAMES_CHANGE(event) {
	        let savedStatus = "";
	        if (event.games.length > 0) {
	            const status = PresenceStore.getStatus(UserStore.getCurrentUser().id);
	            savedStatus = status;
	            updateAsync(settings.store.statusToSet);
	        } else if (event.games.length === 0) {
	            updateAsync(savedStatus);
	        }
    	},
    }
});
