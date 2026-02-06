/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { QuestSpooferLogger } from "@plugins/questSpoofer/constants";
import {
    _resetProcessedQuestsForTesting,
    isAutoQuestListenerActive,
    resetProcessedQuestCache,
    runQuestSpoofer,
    startAutoQuestListener,
    stopAutoQuestListener,
} from "@plugins/questSpoofer/runner";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

export default definePlugin({
    name: "QuestSpoofer",
    description:
        "Spoofs Discord Quests for video, desktop play, and streaming, and auto-claims rewards when possible. Originally based on a user plugin shared in the Vencord Discord.",
    authors: [Devs.Eagle],
    required: true,
    isEagleCord: true,

    toolboxActions: {
        async "Fetch & Spoof Quests"() {
            await runQuestSpoofer();
        },
        "Reset Auto Cache"() {
            resetProcessedQuestCache();
            showToast("Auto quest cache cleared.", Toasts.Type.SUCCESS);
        },
        "Toggle Auto-Spoof"() {
            if (isAutoQuestListenerActive()) {
                stopAutoQuestListener();
                return showToast(
                    "Auto quest listener stopped.",
                    Toasts.Type.MESSAGE,
                );
            }

            startAutoQuestListener();
            showToast("Auto quest listener started.", Toasts.Type.SUCCESS);
        },
    },

    async start() {
        await runQuestSpoofer();
        startAutoQuestListener();
    },

    stop() {
        stopAutoQuestListener();
        QuestSpooferLogger.info("QuestSpoofer plugin stopped.");
        showToast("QuestSpoofer plugin stopped.", Toasts.Type.MESSAGE);
    },

    _resetProcessedQuestsForTesting() {
        _resetProcessedQuestsForTesting();
    },
});
