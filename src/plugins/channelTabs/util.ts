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

import { DataStore } from "@api/index.js";
import { definePluginSettings } from "@api/settings.js";
import { OptionType } from "@utils/types.js";
import { filters, mapMangledModuleLazy } from "@webpack";
import { SelectedChannelStore, Toasts } from "@webpack/common";

import { ChannelTabsPreivew } from "./components.jsx";

export interface ChannelTabsProps { guildId: string, channelId: string; }

export const channelTabsSettings = definePluginSettings({
    onStartup: {
        type: OptionType.SELECT,
        description: "On startup",
        options: [{
            label: "Do nothing (open on the friends tab)",
            value: "nothing",
            default: true
        }, {
            label: "Remember tabs from last session",
            value: "remember"
        }, {
            label: "Open on a specific set of tabs",
            value: "preset"
        }],
    },
    tabSet: {
        component: ChannelTabsPreivew,
        description: "Select which tabs to open at startup",
        type: OptionType.COMPONENT,
    }
});

// TODO: replace with commons export when #450 is merged
const NavigationRouter = mapMangledModuleLazy('"transitionToGuild', {
    transitionTo: filters.byCode('"transitionTo '),
    transitionToGuild: filters.byCode('"transitionToGuild'),
});

let openChannelIndex = 0;
const openChannels: ChannelTabsProps[] = [];

const setCurrentTabTo = (t: ChannelTabsProps) => openChannels[openChannelIndex] = t;
const isTabSelected = (ch: ChannelTabsProps) => openChannels.indexOf(ch) === openChannelIndex;
const isEqualToCurrentTab = (ch: ChannelTabsProps) => openChannels[openChannelIndex].channelId === ch.channelId;
function moveToTab(i: number) {
    if (i < 0 || i >= openChannels.length) return;
    const chnl = openChannels[i];
    openChannelIndex = i;
    if (chnl.channelId !== SelectedChannelStore.getChannelId())
        NavigationRouter.transitionToGuild(chnl.guildId, chnl.channelId);
}
function moveToTabRelative(d: number) {
    const i = d + openChannelIndex;
    moveToTab(i);
}
function createTab(t: ChannelTabsProps, messageId?: string) {
    openChannels.push({ ...t });
    openChannelIndex = openChannels.length - 1;
    if (messageId) NavigationRouter.transitionTo(`/channels/${t.guildId}/${t.channelId}/${messageId}`);
}
function closeTab(i: number) {
    openChannels.splice(i, 1);
    if (openChannelIndex === i) moveToTab(Math.max(i - 1, 0));
    if (openChannelIndex > i) openChannelIndex--;
}
function closeCurrentTab() {
    openChannels.splice(openChannelIndex, 1);
    moveToTab(Math.max(openChannelIndex - 1, 0));
}
function shiftCurrentTab(direction: 1 /* right */ | -1 /* left */) {
    const prev = openChannels[openChannelIndex + direction];
    if (!prev || !("channelId" in prev)) return;
    openChannels[openChannelIndex + direction] = openChannels[openChannelIndex];
    openChannels[openChannelIndex] = prev;
    openChannelIndex += direction;
}
async function initalize(currentChannel: ChannelTabsProps) {
    const settings = channelTabsSettings;
    if (["remember", "preset"].includes(settings.store.onStartup)) {
        if (Vencord.Plugins.isPluginEnabled("KeepCurrentChannel")) Toasts.show({
            id: Toasts.genId(),
            message: "ChannelTabs - Not restoring tabs as KeepCurrentChannel is enabled",
            type: Toasts.Type.FAILURE,
            options: {
                duration: 3000,
                position: Toasts.Position.BOTTOM
            }
        });
        else {
            const preferredTabs = settings.store.onStartup === "remember"
                ? await DataStore.get("ChannelTabs_openChannels")
                : settings.store.tabSet ?? [{ guildId: "@me", channelId: undefined as any } /* friends tab */];
            if (Array.isArray(preferredTabs)) {
                preferredTabs.forEach(c => openChannels.push(c));
            } else if (preferredTabs) {
                ({ openChannelIndex } = preferredTabs);
                preferredTabs.openChannels.forEach(c => openChannels.push(c));
            }
        }
    }
    // the reason this always transitions is to rerender the tabs component once it's initalized
    // there is absolutely a better way to do this i'm just lazy
    if (openChannels.length) NavigationRouter.transitionToGuild(
        openChannels[openChannelIndex].guildId, openChannels[openChannelIndex].channelId
    );
    else {
        openChannels.push(currentChannel);
        NavigationRouter.transitionToGuild(currentChannel.guildId, currentChannel.channelId);
    }
}
// data argument is only for testing purposes
const saveChannels = (data?: any) => DataStore.set("ChannelTabs_openChannels", data ?? { openChannels, openChannelIndex });

export const ChannelTabsUtils = {
    closeCurrentTab, closeTab, createTab, initalize, isEqualToCurrentTab, isTabSelected,
    moveToTab, moveToTabRelative, openChannels, saveChannels, shiftCurrentTab, setCurrentTabTo
};
