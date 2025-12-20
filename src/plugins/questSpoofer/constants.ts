/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { findByPropsLazy } from "@webpack";

/** Store for stream metadata. */
export const ApplicationStreamingStore = findByPropsLazy(
    "getStreamerActiveStreamMetadata",
);
/** Store for running game processes. */
export const RunningGameStore = findByPropsLazy(
    "getRunningGames",
    "getGameForPID",
);
/** Store for quest metadata. */
export const QuestsStore = findByPropsLazy("getQuest");

export const QuestTasks = [
    "WATCH_VIDEO",
    "PLAY_ON_DESKTOP",
    "STREAM_ON_DESKTOP",
    "PLAY_ACTIVITY",
    "WATCH_VIDEO_ON_MOBILE",
] as const;

/** Generates a pseudo-random pid within a sensible range. */
export const randomPid = () => Math.floor(Math.random() * 30000) + 1000;
export const QuestSpooferLogger = new Logger("QuestSpoofer", "#473763");
