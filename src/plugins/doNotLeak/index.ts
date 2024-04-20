/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import styles from "./style.css?managed";

const settings = definePluginSettings({
    hoverToView: {
        type: OptionType.BOOLEAN,
        description: "When hovering over a message, show the contents.",
        default: false,
        restartNeeded: false,
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
        restartNeeded: false,
        onChange: () => {
            console.log(settings.store.enableForStream);
            updateClassList("hide-in-streamer-mode", settings.store.enableForStream);
        },
    },
});

export default definePlugin({
    name: "Do Not Leak!",
    description: "Hide all message contents and attachments when you're streaming or sharing your screen.",
    authors: [Devs.Perny],
    settings,
    start() {
        document.addEventListener("keyup", keyUpHandler);
        document.addEventListener("keydown", keyDownHandler);
        updateClassList("hover-to-view", settings.store.hoverToView);
        updateClassList("hide-in-streamer-mode", settings.store.enableForStream);
        enableStyle(styles);
    },
    stop() {
        document.removeEventListener("keyup", keyUpHandler);
        document.removeEventListener("keydown", keyDownHandler);
        disableStyle(styles);
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
