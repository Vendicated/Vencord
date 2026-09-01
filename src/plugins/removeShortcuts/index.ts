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

const removeShortcutsPlugin = definePlugin({
    name: "RemoveShortcuts",
    description:
        "Remove keyboard shortcuts from discord. By default `CTRL + '` and `CTRL + SHIFT + '` to call is disabled. This plugin blocks input from reaching Discord's keyboard shortcut handler.",
    authors: [Devs.Kim],
    start() {
        if (this.keydownHandler) return;
        this.reloadCombos(this.settings.store.userRemovedShortcuts);
        this.reloadRemoveCallShortcut(this.settings.store.removeCallShortcut);
        this.keydownHandler = (e: KeyboardEvent) => {
            for (const combo of this.keyCombos) {
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
        document.addEventListener("keydown", this.keydownHandler, true);
    },
    stop() {
        document.removeEventListener("keydown", this.keydownHandler!, true);
        this.keydownHandler = null;
        this.keyCombos = [];
    },
    settings: definePluginSettings({
        removeCallShortcut: {
            type: OptionType.BOOLEAN,
            name: "Remove Call Shortcut",
            description: "Removes the `CTRL + '` and `CTRL + SHIFT + '` keyboard shortcut to start a call.",
            default: true,
            onChange(value) {
                removeShortcutsPlugin.reloadRemoveCallShortcut(value);
            },
        },
        userRemovedShortcuts: {
            type: OptionType.STRING,
            name: "Custom Removed Shortcuts",
            description:
                "A list of custom keyboard shortcuts to remove from Discord. Separated by |, in the format `CTRL + Slash` or `ALT + KeyB`. Modifiers are optional. Example: `CTRL + SHIFT + KeyA | ALT + KeyC`",
            default: "",
            onChange(value) {
                removeShortcutsPlugin.reloadCombos(value);
            },
        },
    }),
    keydownHandler: null as ((e: KeyboardEvent) => void) | null,
    keyCombos: [] as KeyCombo[],
    reloadCombos(value: string) {
        this.keyCombos = this.keyCombos.filter(c => !c.userDefined);

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
            this.keyCombos.push(combo);
        }
    },
    reloadRemoveCallShortcut(value: boolean) {
        this.keyCombos = this.keyCombos.filter(c => !callShortcuts.some(cc => matchesCombo(c, cc)));

        if (value) {
            this.keyCombos.push(...callShortcuts);
        }
    },
});

export default removeShortcutsPlugin;
