/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Constants, PermissionsBits, PermissionStore, React, RestAPI, useCallback, useEffect, useState } from "@webpack/common";

const validKeycodes = [
    "Backspace", "Tab", "Enter", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "Pause", "CapsLock",
    "Escape", "Space", "PageUp", "PageDown", "End", "Home", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "PrintScreen", "Insert",
    "Delete", "Digit0", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "KeyA", "KeyB", "KeyC",
    "KeyD", "KeyE", "KeyF", "KeyG", "KeyH", "KeyI", "KeyJ", "KeyK", "KeyL", "KeyM", "KeyN", "KeyO", "KeyP", "KeyQ", "KeyR", "KeyS", "KeyT",
    "KeyU", "KeyV", "KeyW", "KeyX", "KeyY", "KeyZ", "MetaLeft", "MetaRight", "ContextMenu", "Numpad0", "Numpad1", "Numpad2", "Numpad3",
    "Numpad4", "Numpad5", "Numpad6", "Numpad7", "Numpad8", "Numpad9", "NumpadMultiply", "NumpadAdd", "NumpadSubtract", "NumpadDecimal",
    "NumpadDivide", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "NumLock", "ScrollLock",
];

function showIcon() {
    const [show, setShow] = useState(false);
    const { keyBind, reqCtrl, reqShift, reqAlt } = settings.store;

    const handleKeys = useCallback((e: KeyboardEvent) => {
        const isMatchingKey =
            e.code === keyBind &&
            (!reqCtrl || e.ctrlKey) &&
            (!reqShift || e.shiftKey) &&
            (!reqAlt || e.altKey);

        setShow(isMatchingKey);
    }, [keyBind, reqCtrl, reqShift, reqAlt]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeys);
        window.addEventListener("keyup", handleKeys);

        return () => {
            window.removeEventListener("keydown", handleKeys);
            window.removeEventListener("keyup", handleKeys);
        };
    }, [handleKeys]);

    return show;
}

// TY ToggleVideoBind
const settings = definePluginSettings({
    keyBind: {
        description: "The key to toggle trash when pressed.",
        type: OptionType.STRING,
        default: "KeyZ",
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

export default definePlugin({
    name: "FastDeleteChannels",
    description: "Adds a trash icon to delete channels",
    authors: [Devs.thororen],
    settings,
    patches: [
        // TY TypingIndicator
        // Normal Channels
        {
            find: "UNREAD_IMPORTANT:",
            replacement: {
                match: /\.Children\.count.+?:null(?<=,channel:(\i).+?)/,
                replace: "$&,$self.TrashIcon($1)"
            }
        },
        // Threads
        {
            find: "spineWithGuildIcon]:",
            replacement: {
                match: /mentionsCount:\i.+?null(?<=channel:(\i).+?)/,
                replace: "$&,$self.TrashIcon($1)"
            }
        }
    ],
    TrashIcon: channel => {
        const show = showIcon();

        if (!show || !PermissionStore.can(PermissionsBits.MANAGE_CHANNELS, channel)) return null;

        return (
            <span
                onClick={() => RestAPI.del({ url: Constants.Endpoints.CHANNEL(channel.id) })}
            >
                <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    color="#ed4245"
                >
                    <path
                        fill="currentColor"
                        d="M14.25 1c.41 0 .75.34.75.75V3h5.25c.41 0 .75.34.75.75v.5c0 .41-.34.75-.75.75H3.75A.75.75 0 0 1 3 4.25v-.5c0-.41.34-.75.75-.75H9V1.75c0-.41.34-.75.75-.75h4.5Z"
                    />
                    <path
                        fill="currentColor"
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M5.06 7a1 1 0 0 0-1 1.06l.76 12.13a3 3 0 0 0 3 2.81h8.36a3 3 0 0 0 3-2.81l.75-12.13a1 1 0 0 0-1-1.06H5.07ZM11 12a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm3-1a1 1 0 1 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z"
                    />
                </svg>
            </span>
        );
    }
});
