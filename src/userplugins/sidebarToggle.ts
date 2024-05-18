/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

function toggleView(el, slideDirection) {
    const isHidden = el.style.display === "none";

    if (isHidden) {
        el.style.display = "flex"; // Set display to 'flex'
    } else {
        el.style.display = "none"; // Set display to 'none'
    }

    // Force update to trigger a re-render
    el.forceUpdate();
}

function resetView(el) {
    el.style.display = "none"; // Set display to 'none'
    setTimeout(() => {
        // Force update to trigger a re-render
        el.forceUpdate();
    }, 10);
}

function handler(event) {
    const serverSidebarHotkey = settings.store.serverSidebarHotkey.toLowerCase();
    const channelsSidebarHotkey = settings.store.channelsSidebarHotkey.toLowerCase();
    const memberListHotkey = settings.store.memberListHotkey.toLowerCase();

    if (serverSidebarHotkey && event.altKey && event.key.toLowerCase() === serverSidebarHotkey) {
        // WARN: not sure how to safely select classNames since these may change often
        toggleView(document.querySelector('[aria-label="Servers sidebar"]'), -100);
    } else if (channelsSidebarHotkey && event.altKey && event.key.toLowerCase() === channelsSidebarHotkey) {
        // WARN: not sure how to safely select classNames since these may change often
        toggleView(document.querySelector(".sidebar_ded4b5"), -100);
    } else if (memberListHotkey && event.altKey && event.key.toLowerCase() === memberListHotkey) {
        // WARN: not sure how to safely select classNames since these may change often
        toggleView(document.querySelector(".container_b2ce9c"), 100);
    }
}

const settings = definePluginSettings({
    serverSidebarHotkey: {
        type: OptionType.STRING,
        description: "Hotkey for toggling the server sidebar",
        default: "s",
    },
    channelsSidebarHotkey: {
        type: OptionType.STRING,
        description: "Hotkey for toggling the channels sidebar",
        default: "c",
    },
    memberListHotkey: {
        type: OptionType.STRING,
        description: "Hotkey for toggling the member list",
        default: "m",
    },
});

export default definePlugin({
    name: "SidebarToggle",
    description: "Adds hotkeys to toggle the channels, server sidebar, and member list with animation",
    authors: [Devs.Nuckyz
    ],
    settings,
    start() {
        document.addEventListener("keydown", handler);
    },
    stop() {
        document.removeEventListener("keydown", handler);
    },
});
