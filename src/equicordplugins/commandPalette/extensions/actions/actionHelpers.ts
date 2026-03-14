/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IS_MAC } from "@utils/constants";
import type { ComponentType } from "react";

import type { CommandActionDefinition } from "../../registry";

interface CreateExecuteSecondaryActionInput {
    id: string;
    label: string;
    chord: string;
    handler: () => void | Promise<void>;
    icon?: ComponentType<{ className?: string; size?: string; }>;
}

function normalizePlatformChord(chord: string): string {
    if (IS_MAC) return chord;

    return chord
        .split("+")
        .map(token => {
            const normalized = token.trim().toLowerCase();
            if (normalized === "meta" || normalized === "cmd" || normalized === "command" || normalized === "⌘") {
                return "ctrl";
            }

            return token;
        })
        .join("+");
}

function formatActionChordToken(token: string): string {
    const normalized = token.trim().toLowerCase();
    if (!normalized) return "";
    if (normalized === "meta" || normalized === "cmd" || normalized === "command" || normalized === "⌘") return "Cmd";
    if (normalized === "alt" || normalized === "option" || normalized === "⌥") return "Alt";
    if (normalized === "ctrl" || normalized === "control" || normalized === "⌃" || normalized === "^") return "CTRL";
    if (normalized === "shift" || normalized === "⇧") return "SHIFT";
    if (normalized === "enter" || normalized === "return" || normalized === "↵") return "ENTER";
    if (normalized === "left" || normalized === "←") return "LEFT";
    if (normalized === "right" || normalized === "→") return "RIGHT";
    if (normalized === "up" || normalized === "↑") return "UP";
    if (normalized === "down" || normalized === "↓") return "DOWN";
    if (normalized === "escape" || normalized === "esc") return "ESC";
    if (normalized === "tab") return "TAB";
    if (normalized === "space") return "SPACE";
    return normalized.length === 1 ? normalized.toUpperCase() : normalized.toUpperCase();
}

export function formatActionChordLabel(chord: string): string {
    return normalizePlatformChord(chord)
        .split("+")
        .map(formatActionChordToken)
        .filter(Boolean)
        .join("+");
}

export function createExecuteSecondaryAction({
    id,
    label,
    chord,
    handler,
    icon
}: CreateExecuteSecondaryActionInput): CommandActionDefinition {
    return {
        id,
        label,
        shortcut: formatActionChordLabel(chord),
        icon,
        intent: { type: "execute-secondary", actionKey: normalizePlatformChord(chord) },
        handler
    };
}
