/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { logger } from "@components/settings/tabs/plugins";

import { KeybindManager, WindowShortcut, WindowShortcutOptions } from "./types";

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


type EventKeyChecks = {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
    keys: string[];
};

export default new class WindowManager implements KeybindManager {
    private mapCallbacks: Map<string, (event: KeyboardEvent | MouseEvent) => void> = new Map();
    private getKeyChecks(keys: WindowShortcut): EventKeyChecks {
        return {
            ctrl: keys.includes("Control"),
            shift: keys.includes("Shift"),
            alt: keys.includes("Alt"),
            meta: keys.includes("Meta"),
            keys: keys.filter(key => !["Control", "Shift", "Alt", "Meta"].includes(key))
        };
    }

    isAvailable(): boolean {
        return !!window;
    }

    registerKeybind(event: string, keys: WindowShortcut, callback: () => void, options: WindowShortcutOptions): boolean {
        if (this.mapCallbacks.has(event)) return false;
        const keysToCheck = this.getKeyChecks(keys);
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
                if (keydown) callback();
                if (keyup) callback();
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
        this.mapCallbacks.set(event, checkKeys);
        return true;
    }

    unregisterKeybind(event: string): boolean {
        if (!this.mapCallbacks.has(event)) return false;
        const checkKeys = this.mapCallbacks.get(event)!;
        window.removeEventListener("keydown", checkKeys);
        window.removeEventListener("keyup", checkKeys);
        window.removeEventListener("mousedown", checkKeys);
        window.removeEventListener("mouseup", checkKeys);
        this.mapCallbacks.delete(event);
        return true;
    }

    inputCaptureKeys(
        inputId: string,
        callback: (keys: WindowShortcut) => void
    ) {
        const keys: string[] = [];
        const inputElement = document.getElementById(inputId) as HTMLInputElement;
        let timeout: NodeJS.Timeout | undefined = undefined;

        const startRecording = () => {
            inputElement.addEventListener("keydown", keydownHandler, { capture: true });
            inputElement.addEventListener("keyup", keyupHandler, { capture: true });
            inputElement.addEventListener("mousedown", keydownHandler, { capture: true });
            inputElement.addEventListener("mouseup", keyupHandler, { capture: true });
        };
        const stopRecording = () => {
            stopTimeout();
            inputElement.removeEventListener("keydown", keydownHandler, { capture: true });
            inputElement.removeEventListener("keyup", keyupHandler, { capture: true });
            inputElement.removeEventListener("mousedown", keydownHandler, { capture: true });
            inputElement.removeEventListener("mouseup", keyupHandler, { capture: true });
        };

        const startTimeout = () => {
            timeout = setTimeout(() => {
                invokeCallback([...keys]);
                keys.length = 0;
            }, 5 * 1000);
        };
        const stopTimeout = () => {
            clearTimeout(timeout);
            keys.length = 0;
        };

        const keydownHandler = (event: KeyboardEvent | MouseEvent) => { // TODO: add gamepad detection
            event.stopImmediatePropagation();
            event.stopPropagation();
            event.preventDefault();

            if (event.type === "keydown") {
                const e = event as KeyboardEvent;
                if (e.repeat || keys.includes(e.key)) return;
                keys.push(e.key);
            }
            if (event.type === "mousedown") {
                const e = event as MouseEvent;
                keys.push("Mouse" + e.button);
            }

            if (keys.length === 4) { // Max 4 keys
                invokeCallback([...keys]);
                stopRecording();
                keys.length = 0;
            }
        };
        const keyupHandler = (event: KeyboardEvent | MouseEvent) => { // TODO: add gamepad detection
            event.stopImmediatePropagation();
            event.stopPropagation();
            event.preventDefault();
            if (event.type === "keyup" && (event as KeyboardEvent).key === keys[keys.length - 1]) {
                invokeCallback([...keys]);
            }
            if (event.type === "mouseup" && "Mouse" + (event as MouseEvent).button === keys[keys.length - 1]) {
                invokeCallback([...keys]);
            }
        };
        const invokeCallback = (keys: WindowShortcut) => {
            try {
                callback(keys);
            } catch (error) {
                logger.error("Error in callback:", error);
            }
        };

        inputElement.addEventListener("focus", () => startTimeout());
        inputElement.addEventListener("blur", () => stopTimeout());
        startRecording();

        return stopRecording;
    }

    keysToString(keys: WindowShortcut): string {
        return keys.map(key => key === " " ? "SPACE" : key.toUpperCase()).join("+");
    }
};
