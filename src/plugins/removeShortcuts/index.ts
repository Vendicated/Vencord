/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

type KeyCombo = {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
    code: string;
    userDefined?: boolean;
};

function parseCombo(line: string): KeyCombo | null {
    const parts = line.split("+").map(p => p.trim());
    const combo: KeyCombo = {
        ctrl: false,
        shift: false,
        alt: false,
        meta: false,
        code: "",
    };

    for (const part of parts) {
        switch (part.toLowerCase()) {
            case "ctrl":
                combo.ctrl = true;
                break;
            case "shift":
                combo.shift = true;
                break;
            case "alt":
                combo.alt = true;
                break;
            case "meta":
            case "cmd":
            case "win":
            case "mod":
                combo.meta = true;
                break;
            default:
                if (combo.code !== "") return null;
                combo.code = part;
        }
    }

    return combo.code ? combo : null;
}

let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let combos: KeyCombo[] = [];

function reloadCombos(value: string) {
    combos = combos.filter(c => !c.userDefined);

    if (value.trim().length === 0) {
        return;
    }

    const lines = value
        .split("|")
        .map(l => l.trim())
        .filter(l => l.length > 0);

    for (const line of lines) {
        const combo = parseCombo(line);

        if (!combo) continue;
        combo.userDefined = true;
        combos.push(combo);
    }
}

const callShortcuts: KeyCombo[] = [
    {
        ctrl: true,
        shift: false,
        alt: false,
        meta: false,
        code: "Quote",
    },
    {
        ctrl: true,
        shift: true,
        alt: false,
        meta: false,
        code: "Quote",
    },
];

function matchesCombo(a: KeyCombo, b: KeyCombo): boolean {
    return (
        a.code === b.code &&
        a.ctrl === b.ctrl &&
        a.shift === b.shift &&
        a.alt === b.alt &&
        a.meta === b.meta
    );
}

function reloadRemoveCallShortcut(value: boolean) {
    if (value) {
        combos.push(...callShortcuts);
    }
    else {
        combos = combos.filter(c => !callShortcuts.some(cc => matchesCombo(c, cc)));
    }
}

const removeShortcutsPlugin = definePlugin({
    name: "RemoveShortcuts",
    description:
        "Remove keyboard shortcuts from discord. By default `CTRL + '` and `CTRL + SHIFT + '` to call is disabled. This plugin blocks input from reaching Discord's keyboard shortcut handler.",
    authors: [Devs.Kim],
    start() {
        if (keydownHandler) return;
        reloadCombos(this.settings.store.userRemovedShortcuts);
        reloadRemoveCallShortcut(this.settings.store.removeCallShortcut);
        keydownHandler = (e: KeyboardEvent) => {
            for (const combo of combos) {
                if (matchesCombo(combo, {
                    code: e.code,
                    ctrl: e.ctrlKey,
                    shift: e.shiftKey,
                    alt: e.altKey,
                    meta: e.metaKey,
                })) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return;
                }
            }
        };
        document.addEventListener("keydown", keydownHandler, true);
    },
    stop() {
        document.removeEventListener("keydown", keydownHandler!, true);
        keydownHandler = null;
        combos = [];
    },
    settings: definePluginSettings({
        removeCallShortcut: {
            type: OptionType.BOOLEAN,
            name: "Remove Call Shortcut",
            description: "Removes the `CTRL + '` and `CTRL + SHIFT + '` keyboard shortcut to start a call.",
            default: true,
            onChange(value) {
                reloadRemoveCallShortcut(value);
            },
        },
        userRemovedShortcuts: {
            type: OptionType.STRING,
            name: "Custom Removed Shortcuts",
            description:
                "A list of custom keyboard shortcuts to remove from Discord. Separated by |, in the format `CTRL + Slash` or `ALT + KeyB`. Modifiers are optional. Example: `CTRL + SHIFT + KeyA | ALT + KeyC`",
            default: "",
            onChange(value) {
                reloadCombos(value);
            },
        },
    }),
});

export default removeShortcutsPlugin;
