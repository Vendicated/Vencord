/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

const validKeycodes = [
    "Backspace", "Tab", "Enter", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "Pause", "CapsLock",
    "Escape", "Space", "PageUp", "PageDown", "End", "Home", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "PrintScreen", "Insert",
    "Delete", "Digit0", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "KeyA", "KeyB", "KeyC",
    "KeyD", "KeyE", "KeyF", "KeyG", "KeyH", "KeyI", "KeyJ", "KeyK", "KeyL", "KeyM", "KeyN", "KeyO", "KeyP", "KeyQ", "KeyR", "KeyS", "KeyT",
    "KeyU", "KeyV", "KeyW", "KeyX", "KeyY", "KeyZ", "MetaLeft", "MetaRight", "ContextMenu", "Numpad0", "Numpad1", "Numpad2", "Numpad3",
    "Numpad4", "Numpad5", "Numpad6", "Numpad7", "Numpad8", "Numpad9", "NumpadMultiply", "NumpadAdd", "NumpadSubtract", "NumpadDecimal",
    "NumpadDivide", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "NumLock", "ScrollLock",
];

const settings = definePluginSettings({
    keyBind: {
        description: "The key to toggle webcam when pressed.",
        type: OptionType.STRING,
        default: "KeyX",
        isValid: (value: string) => validKeycodes.includes(value),
    },
    reqCtrl: {
        description: "Require control to be held.",
        type: OptionType.BOOLEAN,
        default: true,
    },
    reqShift: {
        description: "Require shift to be held.",
        type: OptionType.BOOLEAN,
        default: true,
    },
    reqAlt: {
        description: "Require alt to be held.",
        type: OptionType.BOOLEAN,
        default: false,
    },
});

const { isVideoEnabled } = findByPropsLazy("isVideoEnabled");

function handleKeydown({ code, ctrlKey, shiftKey, altKey }: KeyboardEvent) {
    const { keyBind, reqCtrl, reqShift, reqAlt } = settings.store;
    if (keyBind !== code || ctrlKey !== reqCtrl || shiftKey !== reqShift || altKey !== reqAlt) { return; } // please don't think about it

    FluxDispatcher.dispatch({
        type: "MEDIA_ENGINE_SET_VIDEO_ENABLED",
        enabled: !isVideoEnabled(),
    });
}

export default definePlugin({
    name: "ToggleVideoBind",
    description: "Adds a customizable bind to toggle webcam.",
    authors: [EquicordDevs.mochienya],
    settings,
    start() {
        document.addEventListener("keydown", handleKeydown);
    },
    stop() {
        document.removeEventListener("keydown", handleKeydown);
    },
});
