/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { MessageActions, SelectedChannelStore, useState } from "@webpack/common";


const cl = classNameFactory("vc-command-palette-");
let isRecordingGlobal = false;

function sendCustomMessage(channelId: string, content: string) {
    const messageData = {
        content: content.trim(), // Trim content before sending
    };
    MessageActions.sendMessage(channelId, messageData, true);
}

function getCurrentChannelId(): string {
    return SelectedChannelStore.getChannelId();
}

export const settings = definePluginSettings({
    hotkey: {
        description: "The hotkey to open the command palette.",
        type: OptionType.COMPONENT,
        default: ["F23"],
        component: () => {
            const [isRecording, setIsRecording] = useState(false);

            const recordKeybind = (setIsRecording: (value: boolean) => void) => {
                const keys: Set<string> = new Set();
                const keyLists: string[][] = [];

                setIsRecording(true);
                isRecordingGlobal = true;

                const updateKeys = () => {
                    if (keys.size === 0 || !document.querySelector(`.${cl("key-recorder-button")}`)) {
                        const longestArray = keyLists.reduce((a, b) => a.length > b.length ? a : b);
                        if (longestArray.length > 0) {
                            settings.store.hotkey = longestArray.map(key => key.toLowerCase());
                        }
                        setIsRecording(false);
                        isRecordingGlobal = false;
                        document.removeEventListener("keydown", keydownListener);
                        document.removeEventListener("keyup", keyupListener);
                    }
                    keyLists.push(Array.from(keys));
                };

                const keydownListener = (e: KeyboardEvent) => {
                    const { key } = e;
                    if (!keys.has(key)) {
                        keys.add(key);
                    }
                    updateKeys();
                };

                const keyupListener = (e: KeyboardEvent) => {
                    keys.delete(e.key);
                    updateKeys();
                };

                document.addEventListener("keydown", keydownListener);
                document.addEventListener("keyup", keyupListener);
            };

            return (
                <>
                    <div className={cl("key-recorder-container")} onClick={() => recordKeybind(setIsRecording)}>
                        <div className={`${cl("key-recorder")} ${isRecording ? cl("recording") : ""}`}>
                            {settings.store.hotkey.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" + ")}
                            <button className={`${cl("key-recorder-button")} ${isRecording ? cl("recording-button") : ""}`} disabled={isRecording}>
                                {isRecording ? "Recording..." : "Record keybind"}
                            </button>
                        </div>
                    </div>
                </>
            );
        },
    },
    customMessage: {
        description: "The message to send when the hotkey is pressed.",
        type: OptionType.STRING,
        default: ".pick",
    }
});

export default definePlugin({
    name: "AutoPickFix",
    description: "Sends custom Message into chat when hotkey is pressed",
    authors: [Devs.Nuckyz],
    settings,

    start() {
        document.addEventListener("keydown", this.event);
    },

    stop() {
        document.removeEventListener("keydown", this.event);
    },

    event: function (e: KeyboardEvent) {
        const { hotkey } = settings.store;
        const pressedKey = e.key.toLowerCase();

        hotkey.forEach(key => {
            if (pressedKey === key.toLowerCase()) {
                sendCustomMessage(getCurrentChannelId(), settings.store.customMessage);
            }
        });
    }
});
