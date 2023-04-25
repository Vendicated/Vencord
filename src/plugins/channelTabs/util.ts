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
import { NavigationRouter, SelectedChannelStore, Toasts } from "@webpack/common";

import { ChannelTabsPreivew } from "./components.jsx";

export type ChannelProps = {
    guildId: string;
    channelId: string;
};
export interface ChannelTabsProps extends ChannelProps {
    id: number;
}

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
        default: {}
    },
    channelNameEmojis: {
        type: OptionType.BOOLEAN,
        description: "Channel name emojis",
        default: false
    }
});

function without<T extends Record<string, any>, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
    const obj2 = { ...obj };
    keys.forEach(k => { delete obj2[k]; });
    return obj2;
}


// TODO: this entire utils section needs a rewrite
let openChannelIndex = 0;
const openChannelHistory = [0];
const maxHistoryLength = 10;

const openChannels: ChannelProps[] = [];

function handleChannelSwitch(ch: ChannelProps) {
    if (openChannels[openChannelIndex].channelId !== ch.channelId) openChannels[openChannelIndex] = ch;
}
function isTabSelected(ch: ChannelProps) {
    return openChannels.indexOf(ch) === openChannelIndex;
}
function setOpenChannel(i: number) {
    openChannelIndex = i;
    openChannelHistory.push(i);
    if (openChannelHistory.length > maxHistoryLength) openChannelHistory.shift();
}
function moveToTab(i: number) {
    if (i < 0 || i >= openChannels.length) return;
    const chnl = openChannels[i];
    setOpenChannel(i);
    if (chnl.channelId !== SelectedChannelStore.getChannelId())
        NavigationRouter.transitionToGuild(chnl.guildId, chnl.channelId);
}
function moveToTabRelative(d: number) {
    const i = d + openChannelIndex;
    moveToTab(i);
}
function createTab(t: ChannelProps, jumpTo?: string | boolean) {
    openChannels.push({ ...t });
    setOpenChannel(openChannels.length - 1);
    if (jumpTo) NavigationRouter.transitionTo(`/channels/${t.guildId}/${t.channelId}${window._.isString(jumpTo) ? `/${jumpTo}` : ""}`);
}
function closeTab(i: number) {
    openChannels.splice(i, 1);
    if (openChannelHistory.length >= 2) {
        openChannelHistory.pop(); // once to remove the entry for the current channel
        const newTab = openChannelHistory.at(-1)!;
        openChannelHistory.pop(); // and once to remove the last item in history
        if (openChannelIndex < newTab) moveToTab(newTab - 1);
        else moveToTab(newTab);
    } else {
        if (openChannelIndex === i) moveToTab(Math.max(i - 1, 0));
        if (openChannelIndex > i) setOpenChannel(openChannelIndex - 1);
    }
}
function closeOtherTabs(i: number) {
    const { length } = openChannels;
    const channel = openChannels[i];
    const lastCurrentChannel = openChannels[openChannelIndex];
    for (let n = 0; n < length; n++) openChannels.pop();
    openChannels.push(channel);
    setOpenChannel(0);
    for (let j = 0; j <= openChannelHistory.length; j++) openChannelHistory.pop();
    if (channel.channelId !== lastCurrentChannel.channelId) moveToTab(openChannelIndex);
}
function closeTabsToTheRight(i: number) {
    const { length } = openChannels;
    for (let n = i; n < length - 1; n++) openChannels.pop();
    if (openChannelIndex > (openChannels.length - 1)) {
        setOpenChannel(openChannels.length - 1);
        moveToTab(openChannelIndex);
    }
}
function closeCurrentTab() {
    if (openChannels.length === 1) return;
    openChannels.splice(openChannelIndex, 1);
    moveToTab(Math.max(openChannelIndex - 1, 0));
}
function shiftCurrentTab(direction: 1 /* right */ | -1 /* left */) {
    const prev = openChannels[openChannelIndex + direction];
    if (!prev || !("channelId" in prev)) return;
    openChannels[openChannelIndex + direction] = openChannels[openChannelIndex];
    openChannels[openChannelIndex] = prev;
    setOpenChannel(openChannelIndex + direction);
}
function openStartupTabs(props: ChannelProps & { userId: string; }, update: () => void) {
    if (channelTabsSettings.store.onStartup !== "nothing" && Vencord.Plugins.isPluginEnabled("KeepCurrentChannel")) {
        return Toasts.show({
            id: Toasts.genId(),
            message: "ChannelTabs - Not restoring tabs as KeepCurrentChannel is enabled",
            type: Toasts.Type.FAILURE,
            options: {
                duration: 3000,
                position: Toasts.Position.BOTTOM
            }
        });
    }
    switch (channelTabsSettings.store.onStartup) {
        case "remember": {
            DataStore.get("ChannelTabs_openChannels").then(t => {
                openChannels.pop();
                openChannels.push(...t[props.userId].openChannels);
                ({ openChannelIndex } = t[props.userId]);
                if (openChannels[openChannelIndex].channelId !== SelectedChannelStore.getChannelId())
                    NavigationRouter.transitionToGuild(openChannels[openChannelIndex].guildId, openChannels[openChannelIndex].channelId);
                update();
            });
            break;
        }
        case "preset": {
            const tabs = channelTabsSettings.store.tabSet[props.userId];
            if (tabs) openChannels.push(...channelTabsSettings.store.tabSet[props.userId]);
            else openChannels.push(without(props, "userId"));
            break;
        }
        default: {
            openChannels.push(without(props, "userId"));
        }
    }
    if (!openChannels.length) openChannels.push(without(props, "userId"));
    if (openChannels[openChannelIndex].channelId !== SelectedChannelStore.getChannelId())
        NavigationRouter.transitionToGuild(openChannels[openChannelIndex].guildId, openChannels[openChannelIndex].channelId);
    update();
}
const saveChannels = async (userId: string) => {
    if (!userId) return;
    DataStore.set("ChannelTabs_openChannels", {
        ...(await DataStore.get("ChannelTabs_openChannels") ?? {}),
        [userId]: { openChannels, openChannelIndex }
    });
};

export const ChannelTabsUtils = {
    closeCurrentTab, closeOtherTabs, closeTab, closeTabsToTheRight, createTab, handleChannelSwitch, isTabSelected,
    moveToTab, moveToTabRelative, openChannelHistory, openChannels, saveChannels, shiftCurrentTab, openStartupTabs
};
