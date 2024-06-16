/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { Devs } from "@utils/constants";

import definePlugin, { OptionType, StartAt } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { FluxDispatcher, Menu } from "@webpack/common";
import { createStore, entries, set } from "@api/DataStore";

/**
 * Finds an element with the specified 'aria-label'.
 *
 * @param label The label to search for.
 */
function findElement(label: string): HTMLElement[] {
    const found: HTMLElement[] = [];
    const elements = document.querySelectorAll("[aria-label]");
    for (const element of elements) {
        if (element.getAttribute("aria-label") === label) {
            found.push(element as HTMLElement);
        }
    }
    return found;
}

const mutationObserver = new MutationObserver(onChange);
const hiddenGroupsStore = createStore("HiddenGroups", "HiddenGroupsList");

const hiddenGroups: string[] = [];
const elements: { [key: string]: HTMLElement } = {};

async function saveToStorage(): Promise<void> {
    await set("list", JSON.stringify(hiddenGroups), hiddenGroupsStore);
}

function onChange(): void {
    // Check if the 'Direct Messages' panel is visible.
    const dms = findElement("Direct Messages");
    if (dms.length < 2) return;

    const list = dms[1];

    // Traverse and determine the channel IDs of each element.
    for (const element of list.children) {
        const first = element.children[0];
        if (first == null) continue;

        const anchor = first.children[0];
        if (!anchor) continue;

        const { href } = anchor as HTMLAnchorElement;
        const split = href.split("/");

        if (split.length != 6) continue;
        const channelId = split[split.length - 1];
        elements[channelId] = element as HTMLElement;
    }

    // Hide elements.
    for (const key in elements) {
        if (!hiddenGroups.includes(key)) continue;

        const element = elements[key];
        element.style.display = "none";
    }

    saveToStorage().catch(console.error);
}

function removeIgnored(event: any) {
    if (!settings.store.showOnMessage) return;

    const { channelId, guildId } = event;
    if (guildId != undefined || channelId == undefined) return;

    if (!hiddenGroups.includes(channelId)) return;

    // Append the channel to the list.
    const groupDm = elements[channelId];
    groupDm.style.display = "block";

    // Remove the channel from the ignored list.
    hiddenGroups.splice(hiddenGroups.indexOf(channelId), 1);
    delete elements[channelId];

    saveToStorage().catch(console.error);
}

const settings = definePluginSettings({
    showOnMessage: {
        description: "Reveals a hidden group when a message is received from it.",
        type: OptionType.BOOLEAN,
        default: true
    }
});

const GroupDMContext: NavContextMenuPatchCallback = (children, { channel }) => {
    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
    group.push(
        <Menu.MenuItem
            id={"hide-group"}
            label={"Hide Group"}
            action={() => {
                hiddenGroups.push(channel.id);
                onChange(); // Instantly apply the changes.
            }}
        />
    );
};

export default definePlugin({
    name: "Hide Groups",
    authors: [Devs.Magix],
    description: "Allows hiding group DMs.",
    settings,

    startAt: StartAt.DOMContentLoaded,
    async start() {
        // Import hidden DMs.
        entries(hiddenGroupsStore).then(data => {
            const [_, list] = data[0];
            hiddenGroups.push(...JSON.parse(list));
        });

        FluxDispatcher.subscribe("MESSAGE_CREATE", removeIgnored);
        mutationObserver.observe(document, { childList: true, subtree: true });
    },
    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", removeIgnored);
        mutationObserver.disconnect();
    },

    contextMenus: {
        "gdm-context": GroupDMContext
    }
});
