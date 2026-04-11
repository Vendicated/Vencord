/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { playActivityHandler } from "./playActivity";
import { playOnDesktopHandler } from "./playOnDesktop";
import { streamOnDesktopHandler } from "./streamOnDesktop";
import { QuestHandler } from "./types";
import { videoHandler } from "./video";

export const questHandlers: QuestHandler[] = [
    videoHandler,
    playOnDesktopHandler,
    streamOnDesktopHandler,
    playActivityHandler
];
