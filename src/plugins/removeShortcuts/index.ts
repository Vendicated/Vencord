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
    if (value.trim().length === 0) {
        combos = combos.filter(c => !c.userDefined);
        return;
    }

    const lines = value
        .split("|")
        .map(l => l.trim())
        .filter(l => l.length > 0);

    combos = combos.filter(c => !c.userDefined);

    for (const line of lines) {
        const combo = parseCombo(line);
        if (combo) {
            (combo as KeyCombo).userDefined = true;
            combos.push(combo);
        }
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
        for (const combo of callShortcuts) {
            if (!combos.find(c => matchesCombo(c, combo))) {
                combos.push(combo);
            }
        }
    } else {
        for (const combo of callShortcuts) {
            combos = combos.filter(c => !matchesCombo(c, combo));
        }
    }
}

const removeShortcutsPlugin = definePlugin({
    name: "RemoveShortcuts",
    description:
        "Remove keyboard shortcuts from discord. By default `CTRL + '` and `CTRL + SHIFT + '` to call is disabled because I keep pressing it by accident :3. This plugin blocks input from reaching Discord's keyboard shortcut handler, so there can't be custom behavior on a shortcut.",
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
                "A list of custom keyboard shortcuts to remove from Discord. Seperated by |, in the format `CTRL + Slash` or `ALT + KeyB`. Modifiers are optional. Example: `CTRL + SHIFT + KeyA | ALT + KeyC`",
            default: "",
            onChange(value) {
                reloadCombos(value);
            },
        },
    }),
});

export default removeShortcutsPlugin;
