/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { WindowShortcut } from "@utils/types";

import { WindowShortcutOptions } from "./keybindsManager";

const keysDown = new Set<string>();
const keysUp = new Set<string>();

window.addEventListener("keydown", (e: KeyboardEvent) => {
    keysDown.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    keysUp.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
});
window.addEventListener("keyup", (e: KeyboardEvent) => {
    keysUp.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    keysDown.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
});

const mapCallbacks: Map<string, (event: KeyboardEvent) => void> = new Map();

type EventKeyChecks = {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
    keys: string[];
};

function getKeyChecks(keys: WindowShortcut): EventKeyChecks {
    return {
        ctrl: keys.includes("Control"),
        shift: keys.includes("Shift"),
        alt: keys.includes("Alt"),
        meta: keys.includes("Meta"),
        keys: keys.filter(key => !["Control", "Shift", "Alt", "Meta"].includes(key))
    };
}

export function registerKeybind(name: string, keys: WindowShortcut, callback: () => void, options: WindowShortcutOptions): boolean {
    if (mapCallbacks.has(name)) return false;
    const keysToCheck = getKeyChecks(keys);
    const checkKeys = (event: KeyboardEvent) => {
        let { keydown } = options;
        let { keyup } = options;
        if (keysToCheck.alt === event.altKey && keysToCheck.ctrl === event.ctrlKey && keysToCheck.shift === event.shiftKey && keysToCheck.meta === event.metaKey) {
            for (const key of keysToCheck.keys) {
                if (options.keydown && !keysDown.has(key)) keydown = false;
                if (options.keyup && !keysUp.has(key)) keyup = false;
            }
            if (keydown) callback();
            if (keyup) callback();
        }
    };
    if (options.keydown) window.addEventListener("keydown", checkKeys);
    if (options.keyup) window.addEventListener("keyup", checkKeys);
    mapCallbacks.set(name, checkKeys);
    return true;
}

export function unregisterKeybind(name: string): boolean {
    if (!mapCallbacks.has(name)) return false;
    const checkKeys = mapCallbacks.get(name)!;
    window.removeEventListener("keydown", checkKeys);
    window.removeEventListener("keyup", checkKeys);
    mapCallbacks.delete(name);
    return true;
}
