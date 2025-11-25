/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export default definePluginSettings({
    notices: {
        type: OptionType.BOOLEAN,
        description: "Also show a banner notice at the top of Discord when a new quest appears.",
        default: false
    },
    notifyOrbQuests: {
        type: OptionType.BOOLEAN,
        description: "Notify when quests that reward Orbs become available.",
        default: true
    },
    notifyNonOrbQuests: {
        type: OptionType.BOOLEAN,
        description: "Notify when quests that do not reward Orbs become available.",
        default: true
    },
    offlineNewQuests: {
        type: OptionType.BOOLEAN,
        description:
            "On startup (or reconnect), compare against your last session and notify about quests that appeared while you were offline.",
        default: true
    },
    debugLogQuestsOnStartup: {
        type: OptionType.BOOLEAN,
        description:
            "Log a snapshot of current quests (and one sample quest object) to the console when QuestTracker starts. For debugging only.",
        default: false
    }
});
