/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type CommandEntry,getRecentCommands } from "../registry";

export function getRecentCommandEntries(limit: number): CommandEntry[] {
    const max = Math.max(1, limit);
    return getRecentCommands().slice(0, max);
}
