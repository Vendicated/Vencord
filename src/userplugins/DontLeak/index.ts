/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { getStyle } from "./style";

let [styles, Classes]: [string, object] = ["", {}];

const settings = definePluginSettings({
    hoverToView: {
        type: OptionType.BOOLEAN,
        description: "When hovering over a message, show the contents.",
        default: false,
        onChange: () => {
            console.log(settings.store.hoverToView);
            updateClassList("hover-to-view", settings.store.hoverToView);
        },
    },
    keybind: {
        type: OptionType.STRING,
        description: "The keybind to show the contents of a message.",
        default: "Insert",
        restartNeeded: false,
    },
    enableForStream: {
        type: OptionType.BOOLEAN,
        description: "Blur all messages in streamer mode.",
        default: false,
        onChange: () => {
            console.log(settings.store.enableForStream);
            updateClassList(
                "hide-in-streamer-mode",
                settings.store.enableForStream
            );
        },
    },
});

export default definePlugin({
    name: "Do Not Leak!",
    description:
        "Hide all message contents and attachments when you're streaming or sharing your screen.",
    authors: [
        {
            id: 12345n,
            name: "Your Name",
        },
    ],
    settings,
    start() {
        [styles, Classes] = getStyle();

        const style = document.createElement("style");
        style.setAttribute("id", "vc-dont-leak-style");
        style.innerHTML = styles;
        document.head.appendChild(style);

        document.addEventListener("keyup", keyUpHandler);
        document.addEventListener("keydown", keyDownHandler);
        updateClassList("hover-to-view", settings.store.hoverToView);
        updateClassList(
            "hide-in-streamer-mode",
            settings.store.enableForStream
        );
    },
    stop() {
        document.removeEventListener("keyup", keyUpHandler);
        document.removeEventListener("keydown", keyDownHandler);
        document.getElementById("vc-dont-leak-style")?.remove();
    },
});

function updateClassList(className, condition) {
    if (condition) {
        document.body.classList.add(`vc-dnl-${className}`);
        return;
    }
    document.body.classList.remove(`vc-dnl-${className}`);
}

function keyUpHandler(e: KeyboardEvent) {
    if (e.key !== settings.store.keybind) return;
    updateClassList("show-messages", false);
}

function keyDownHandler(e: KeyboardEvent) {
    if (e.key !== settings.store.keybind) return;
    updateClassList("show-messages", true);
}