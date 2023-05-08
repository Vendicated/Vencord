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

import "./tabs.css";

import { addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import definePlugin from "@utils/types";
import { ReactDOM } from "@webpack/common";

import { ContextMenu } from "./components/ContextMenu";
import TabParent from "./components/TabParent";
import { Tab } from "./types";
import { messageAckHandler, messageCreateHandler, tabs, tabsKey } from "./utils";

/**
 * DONE Add middle click close tab
 * TODO Add draggable/ re-orderable tabs
 * DONE Add GDMs into tabs
 * TODO Update styling when channel is changed
 * TODO Do not allow navigation to the same channel user is currently in
 * TODO Right click on tab brings up correct context menu
 * TODO Horizontal Scroll
 * DONE Show notifications from tabs (with number)
 * TODO Make tabs keyboard navigable (with the tab key)
 * TODO Add favorite tabs
 * DONE Add nickname into tab
 */

export default definePlugin({
    name: "Tabs",
    description: "Adds browser tabs to Discord",
    // TODO add devs.axu
    authors: [],
    flux: {
        MESSAGE_CREATE: messageCreateHandler,
        MESSAGE_ACK: messageAckHandler,
    },
    async start() {
        const div = document.createElement("div");
        const appMount = document.querySelector("#app-mount");
        const contentDiv = document.querySelector(".appAsidePanelWrapper-ev4hlp");

        if (!div || !appMount || !contentDiv) return;

        // Load tabs
        const storedTabs: Map<string, Tab> = await DataStore.get(tabsKey()) || tabs;
        for (const [id, tab] of Array.from(storedTabs)) {
            tabs.set(id, tab);
            if (
                tab.name === undefined ||
                tab.description === undefined ||
                tab.guildId === undefined ||
                tab.isFavorite === undefined ||
                tab.channelId === undefined ||
                tab.displayName === undefined ||
                tab.notificationCount === undefined
            ) {
                tabs.clear();
                await DataStore.set(tabsKey(), tabs);
                break;
            }
        }

        // Inject before everything
        appMount.insertBefore(div, contentDiv);
        ReactDOM.render(<TabParent />, div);

        addContextMenuPatch("channel-context", ContextMenu);
        addContextMenuPatch("user-context", ContextMenu);
        addContextMenuPatch("gdm-context", ContextMenu);
    },
    stop() {
        removeContextMenuPatch("channel-context", ContextMenu);
        removeContextMenuPatch("user-context", ContextMenu);
        addContextMenuPatch("gdm-context", ContextMenu);
    }
});
