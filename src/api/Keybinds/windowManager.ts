/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type WindowShortcut = string[];
export type WindowShortcutOptions = {
    keydown: boolean;
    keyup: boolean;
};

const keysDown = new Set<string>();
const keysUp = new Set<string>();

window.addEventListener("keydown", (e: KeyboardEvent) => {
    keysDown.add(e.key);
    keysUp.delete(e.key);
});
window.addEventListener("keyup", (e: KeyboardEvent) => {
    keysUp.add(e.key);
    keysDown.delete(e.key);
});
window.addEventListener("mousedown", (e: MouseEvent) => { // TODO: find a way to dispatch mouse3 and mouse4
    keysDown.add("Mouse" + e.button);
    keysUp.delete("Mouse" + e.button);
});
window.addEventListener("mouseup", (e: MouseEvent) => { // TODO: find a way to dispatch mouse3 and mouse4
    keysUp.add("Mouse" + e.button);
    keysDown.delete("Mouse" + e.button);
});

/* let gamepadIndex: number | null = null; // TODO: find a way to dispatch gamepad clicks, atm this not works
let polling = false;
const buttonStates: boolean[] = [];

function pollGamepad() {
    if (!polling || gamepadIndex === null) return;

    const gamepads = navigator.getGamepads();
    const gp = gamepads && gamepads[gamepadIndex];

    if (!gp) {
        requestAnimationFrame(pollGamepad);
        return;
    }

    if (buttonStates.length !== gp.buttons.length) {
        for (let i = 0; i < gp.buttons.length; i++) {
            buttonStates[i] = gp.buttons[i].pressed;
        }
    }
    for (let i = 0; i < gp.buttons.length; i++) {
        if (gp.buttons[i].pressed !== buttonStates[i]) {
            document.dispatchEvent(new KeyboardEvent(gp.buttons[i].pressed ? "keydown" : "keyup", {
                key: "Gamepad" + i,
                code: "Gamepad" + i,
                bubbles: true,
                cancelable: true,
                repeat: false,
            })
            );
            buttonStates[i] = gp.buttons[i].pressed;
        }
    }
    requestAnimationFrame(pollGamepad);
}

window.addEventListener("gamepadconnected", (e: GamepadEvent) => {
    if (gamepadIndex === null) {
        gamepadIndex = e.gamepad.index;
        const gp = navigator.getGamepads()[gamepadIndex];
        if (gp) {
            for (let i = 0; i < gp.buttons.length; i++) {
                buttonStates[i] = gp.buttons[i].pressed;
            }
        }
        polling = true;
        requestAnimationFrame(pollGamepad);
    }
});

window.addEventListener("gamepaddisconnected", e => {
    if (e.gamepad.index === gamepadIndex) {
        gamepadIndex = null;
        polling = false;
    }
}, false); */

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

export function registerKeybind(name: string, keys: WindowShortcut, callback: (event: KeyboardEvent | MouseEvent) => void, options: WindowShortcutOptions): boolean {
    if (mapCallbacks.has(name)) return false;
    const keysToCheck = getKeyChecks(keys);
    const types: Set<string> = new Set();
    for (const key of keys) {
        if (key.startsWith("Mouse")) {
            types.add("mouse");
        } else if (key.startsWith("Gamepad")) {
            types.add("gamepad");
        } else {
            types.add("keyboard");
        }
    }
    const checkKeys = (event: KeyboardEvent | MouseEvent) => { // TODO: check for gamepad buttons
        let { keydown } = options;
        let { keyup } = options;
        if (keysToCheck.alt === event.altKey && keysToCheck.ctrl === event.ctrlKey && keysToCheck.shift === event.shiftKey && keysToCheck.meta === event.metaKey) {
            for (const key of keysToCheck.keys) {
                if (options.keydown && !keysDown.has(key)) keydown = false;
                if (options.keyup && !keysUp.has(key)) keyup = false;
            }
            if (keydown) callback(event);
            if (keyup) callback(event);
        }
    };
    for (const type of types) {
        if (type === "mouse") {
            if (options.keydown) window.addEventListener("mousedown", checkKeys);
            if (options.keyup) window.addEventListener("mouseup", checkKeys);
        } else if (type === "gamepad") {
            // TODO: implement gamepad support
        } else {
            if (options.keydown) window.addEventListener("keydown", checkKeys);
            if (options.keyup) window.addEventListener("keyup", checkKeys);
        }
    }
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
