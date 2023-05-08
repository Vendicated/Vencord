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

import { UserStore } from "@webpack/common";

import { globalUpdateTabs } from "./components/TabParent";
import { Tab } from "./types";

// Array of Ids
export const tabs = new Map<string, Tab>();

// tabs key
export const tabsKey = () => `tabs-${UserStore.getCurrentUser().id}`;

export function updateTabs() {
    if (globalUpdateTabs) {
        globalUpdateTabs();
    }
}

export function messageCreateHandler(event) {
    const tab = tabs.get(event.channelId);

    if (!tab) return;

    ++tab.notificationCount;

    updateTabs();
}

export function messageAckHandler(event) {
    const tab = tabs.get(event.channelId);

    if (!tab) return;

    tab.notificationCount = 0;

    updateTabs();
}

export function channelUpdatesHandler(event) {
    for (const channel of event.channels) {
        const { id, name } = channel;
        const tab = tabs.get(id);

        if (!tab) continue;

        tab.name = name;
    }

    updateTabs();
}

export function guildUpdateHandler(event) {
    // Find all guilds with the guild id
    const guildId = event.guild.id;

    const tabsToUpdate = Array.from(tabs).filter(([, tab]) => {
        return tab.guildId === guildId;
    });

    if (!tabsToUpdate.length) return;

    for (const [, tab] of tabsToUpdate) {
        tab.description = event.guild.name;
    }

    updateTabs();
}
