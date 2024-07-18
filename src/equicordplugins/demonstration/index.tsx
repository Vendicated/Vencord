/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Text } from "@webpack/common";

// definitely not stolen from glide :P
async function injectCSS() {
    var elementToRemove = document.getElementById("DemonstrationStyle");
    if (elementToRemove) {
        elementToRemove.remove();
    }
    const styleElement = document.createElement("style");
    styleElement.id = "DemonstrationStyle";
    const content = await fetch("https://minidiscordthemes.github.io/Demonstration/Demonstration.theme.css").then(e => e.text());
    styleElement.textContent = content;
    document.documentElement.appendChild(styleElement);
}

const validKeycodes = [
    "Backspace", "Tab", "Enter", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "Pause", "CapsLock",
    "Escape", "Space", "PageUp", "PageDown", "End", "Home", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "PrintScreen", "Insert",
    "Delete", "Digit0", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "KeyA", "KeyB", "KeyC",
    "KeyD", "KeyE", "KeyF", "KeyG", "KeyH", "KeyI", "KeyJ", "KeyK", "KeyL", "KeyM", "KeyN", "KeyO", "KeyP", "KeyQ", "KeyR", "KeyS", "KeyT",
    "KeyU", "KeyV", "KeyW", "KeyX", "KeyY", "KeyZ", "MetaLeft", "MetaRight", "ContextMenu", "Numpad0", "Numpad1", "Numpad2", "Numpad3",
    "Numpad4", "Numpad5", "Numpad6", "Numpad7", "Numpad8", "Numpad9", "NumpadMultiply", "NumpadAdd", "NumpadSubtract", "NumpadDecimal",
    "NumpadDivide", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "NumLock", "ScrollLock"
];

const settings = definePluginSettings(
    {
        keyBind: {
            description: "The key to toggle the theme when pressed",
            type: OptionType.STRING,
            default: "F6",
            isValid: (value: string) => {
                if (validKeycodes.includes(value)) {
                    return true;
                }
                return false;
            }
        },
        soundVolume: {
            description: "How loud the toggle sound is (0 to disable)",
            type: OptionType.SLIDER,
            default: 0.5,
            markers: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
        },
    });

function handleKeydown(event) {
    if (event.code !== settings.store.keyBind) { return; }

    const style = document.getElementById("DemonstrationStyle");
    if (style != null) {
        style.remove();
        playSound("https://files.catbox.moe/wp5rpz.wav");
    }
    else {
        injectCSS();
        playSound("https://files.catbox.moe/ckz46t.wav");
    }
}

async function playSound(url) {
    const audio = new Audio(url);
    audio.volume = settings.store.soundVolume;
    await audio.play().catch(error => {
        console.error("Error playing sound:", error);
    });
    audio.remove();
}

export default definePlugin({
    name: "Demonstration",
    description: "Plugin for taking theme screenshots - censors identifying images and text.",
    authors: [Devs.Samwich],
    settingsAboutComponent: () => {
        return (
            <>
                <Text>To change your keycode, check out <a href="https://www.toptal.com/developers/keycode" target="_blank">this tool</a>!</Text>
            </>
        );
    },
    start() {
        document.addEventListener("keydown", handleKeydown);
    },
    stop() {
        document.removeEventListener("keydown", handleKeydown);
    },
    settings
});
