/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { WindowShortcut } from "@utils/types";

import { WindowShortcutOptions } from "./keybindsManager";

const keysDown = new Set<string>();
const keysUp = new Set<string>();

const gamepads = {};// TODO: find a way to dispatch keys click
function gamepadHandler(event: Gamepad | GamepadEvent, connected: boolean) {
    const gamepad = "gamepad" in event ? event.gamepad : event as Gamepad;
    console.log("Gamepad event:", event, "Connected:", connected);

    if (connected && gamepad) {
        gamepads[gamepad.index] = gamepad;
    } else if (gamepad) {
        delete gamepads[gamepad.index];
    }
}
window.addEventListener("gamepadconnected", (e: Gamepad | GamepadEvent) => {
    console.log("Gamepad connected", e);
    gamepadHandler(e, true);
}, false);
window.addEventListener("gamepaddisconnected", (e: Gamepad | GamepadEvent) => {
    console.log("Gamepad disconnected", e);
    gamepadHandler(e, false);
});

window.addEventListener("mousedown", (e: MouseEvent) => { // TODO: find a way to dispatch mouse3 and mouse4
    keysDown.add("Mouse" + e.button);
    keysUp.delete("Mouse" + e.button);
});
window.addEventListener("mouseup", (e: MouseEvent) => {
    keysUp.add("Mouse" + e.button);
    keysDown.delete("Mouse" + e.button);
});

window.addEventListener("keydown", (e: KeyboardEvent) => {
    keysDown.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    keysUp.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
});
window.addEventListener("keyup", (e: KeyboardEvent) => {
    keysUp.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    keysDown.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
});

const mapCallbacks: Map<string, (event: KeyboardEvent | MouseEvent) => void> = new Map();

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
    const last = keysToCheck.keys[keysToCheck.keys.length - 1];
    const lastType = last.startsWith("Mouse") ? "mouse" : last.startsWith("Gamepad") ? "gamepad" : "keyboard";
    const checkKeys = (event: KeyboardEvent | MouseEvent) => { // TODO: check for gamepad buttons
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
    if (options.keydown) lastType === "mouse" ? window.addEventListener("mousedown", checkKeys) : window.addEventListener("keydown", checkKeys);
    if (options.keyup) lastType === "mouse" ? window.addEventListener("mouseup", checkKeys) : window.addEventListener("keyup", checkKeys);
    mapCallbacks.set(name, checkKeys);
    return true;
}

export function unregisterKeybind(name: string): boolean {
    if (!mapCallbacks.has(name)) return false;
    const checkKeys = mapCallbacks.get(name)!;
    window.removeEventListener("keydown", checkKeys);
    window.removeEventListener("keyup", checkKeys);
    window.removeEventListener("mousedown", checkKeys);
    window.removeEventListener("mouseup", checkKeys);
    mapCallbacks.delete(name);
    return true;
}
