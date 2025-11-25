/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { debugDumpQuests, ensureInitialisedOnce, startQuestWatcher } from "./utils";

/**
 * Entry point for the Flux CONNECTION_OPEN event.
 * Ensures state is bootstrapped once, then starts the polling timer.
 */
export async function onConnectionOpen(): Promise<void> {
    await ensureInitialisedOnce();
    startQuestWatcher();
}

/**
 * Dev helper exported on the plugin object so you can easily inspect the quest shape.
 *
 * Usage (in DevTools console):
 *   Vencord.Plugins.plugins.QuestTracker.dumpQuestsToConsole()
 */
export function dumpQuestsToConsole(): void {
    debugDumpQuests();
}
