/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { dumpQuestsToConsole, onConnectionOpen } from "./functions";
import settings from "./settings";
import { stopQuestWatcher } from "./utils";

export default definePlugin({
    name: "QuestTracker",
    description: "Notifies you when new Discord quests become available, including Orb quests.",
    authors: [Devs.T7SEN],
    settings,

    // Read-only plugin: no code patches.
    patches: [],

    flux: {
        CONNECTION_OPEN() {
            void onConnectionOpen();
        }
    },

    async start() {
        // Safety net in case the connection is already open when the plugin loads.
        setTimeout(() => {
            void onConnectionOpen();
        }, 5000);
    },

    stop() {
        stopQuestWatcher();
    },

    // Dev helper: call from console:
    // Vencord.Plugins.plugins.QuestTracker.dumpQuestsToConsole()
    dumpQuestsToConsole
});
