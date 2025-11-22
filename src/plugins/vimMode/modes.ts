/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export enum Mode {
    NORMAL = "NORMAL",
    INSERT = "INSERT",
    VISUAL = "VISUAL",
    COMMAND = "COMMAND"
}

export interface VimState {
    mode: Mode;
    buffer: string; // The keys currently being typed (e.g., "2d")
}
