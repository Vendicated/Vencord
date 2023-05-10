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
import { definePluginSettings } from "@api/Settings.js";
import { Logger } from "@utils/Logger.js";
import { OptionType } from "@utils/types.js";
import { NavigationRouter, SelectedChannelStore, Toasts } from "@webpack/common";

import { ChannelTabsPreivew } from "./components.jsx";

export type BasicChannelTabsProps = {
    guildId: string;
    channelId: string;
};
export interface ChannelTabsProps extends BasicChannelTabsProps {
    id: number;
}
interface PersistedTabs {
    [userId: string]: {
        openTabs: ChannelTabsProps[],
        openTabIndex: number;
    };
}

const logger = new Logger("ChannelTabs");

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

function replaceArray<T>(array: T[], ...values: T[]) {
    const len = array.length;
    for (let i = 0; i < len; i++) array.pop();
    array.push(...values);
}

let i = 0;
const genId = () => i++;

const openTabs: ChannelTabsProps[] = [];
const closedTabs: ChannelTabsProps[] = [];
let currentlyOpenTab: number;
const openTabHistory: number[] = [];

let lastUserId: string;

function createTab(props: BasicChannelTabsProps, moveToTab?: boolean, messageId?: string) {
    const { channelId, guildId } = props;
    const id = genId();
    openTabs.push({ ...props, id });
    if (moveToTab) setOpenTab(id);
    else return;

    let path = `/channels/${guildId}/${channelId}`;
    if (messageId) path += `/${messageId}`;
    if (channelId !== SelectedChannelStore.getChannelId() || messageId)
        NavigationRouter.transitionTo(path);
}

function closeTab(id: number) {
    if (openTabs.length <= 1) return;
    const i = openTabs.findIndex(v => v.id === id);
    if (i === -1) return logger.error("Couldn't find channel tab with ID " + id, openTabs);
    const closed = openTabs.splice(i, 1);
    closedTabs.push(...closed);
    if (id === currentlyOpenTab) {
        if (openTabHistory.length) {
            openTabHistory.pop();
            let newTab: ChannelTabsProps | undefined = undefined;
            while (!newTab) {
                const maybeNewTabId = openTabHistory.at(-1);
                openTabHistory.pop();
                if (!maybeNewTabId) {
                    moveToTab(openTabs[Math.max(i - 1, 0)].id);
                }
                const maybeNewTab = openTabs.find(t => t.id === maybeNewTabId);
                if (maybeNewTab) newTab = maybeNewTab;
            }
            moveToTab(newTab.id);
            openTabHistory.pop();
        }
        else moveToTab(openTabs[Math.max(i - 1, 0)].id);
    }
}

function closeCurrentTab() {
    closeTab(currentlyOpenTab);
}

function closeOtherTabs(id: number) {
    const tab = openTabs.find(v => v.id === id);
    if (tab === undefined) return logger.error("Couldn't find channel tab with ID " + id, openTabs);
    const removedTabs = openTabs.filter(v => v.id !== id);
    closedTabs.push(...removedTabs.reverse());
    const lastTab = openTabs.find(v => v.id === currentlyOpenTab)!;
    replaceArray(openTabs, tab);
    setOpenTab(id);
    replaceArray(openTabHistory, id);
    if (tab.channelId !== lastTab.channelId) moveToTab(id);
}

function closeTabsToTheRight(id: number) {
    const i = openTabs.findIndex(v => v.id === id);
    if (i === -1) return logger.error("Couldn't find channel tab with ID " + id, openTabs);
    const tabsToTheRight = openTabs.filter((_, ind) => ind > i);
    closedTabs.push(...tabsToTheRight.reverse());
    const tabsToTheLeft = openTabs.filter((_, ind) => ind <= i);
    replaceArray(openTabs, ...tabsToTheLeft);
    if (!tabsToTheLeft.some(v => v.id === currentlyOpenTab)) moveToTab(openTabs.at(-1)!.id);
}

function handleChannelSwitch(ch: BasicChannelTabsProps) {
    const tab = openTabs.find(c => c.id === currentlyOpenTab)!;
    if (tab === undefined) return logger.error("Couldn't find the currently open channel " + currentlyOpenTab, openTabs);
    if (tab.channelId !== ch.channelId) openTabs[openTabs.indexOf(tab)] = { id: tab.id, ...ch };
}

function isTabSelected(id: number) {
    return id === currentlyOpenTab;
}

function moveToTab(id: number) {
    const tab = openTabs.find(v => v.id === id);
    if (tab === undefined) return logger.error("Couldn't find channel tab with ID " + id, openTabs);
    setOpenTab(id);
    if (tab.channelId !== SelectedChannelStore.getChannelId())
        NavigationRouter.transitionToGuild(tab.guildId, tab.channelId);
}

function moveToTabRelative(offset: number, wrapAround?: boolean) {
    const currentIndex = openTabs.findIndex(c => c.id === currentlyOpenTab);
    const maybeNewTab = currentIndex + offset;
    if (!wrapAround) {
        if (maybeNewTab < 0 || maybeNewTab >= openTabs.length) return;
        moveToTab(openTabs[maybeNewTab].id);
    }
    const newTab = maybeNewTab < 0
        ? openTabs.length + offset
        : maybeNewTab > openTabs.length - 1
            ? maybeNewTab - openTabs.length
            : maybeNewTab;
    if (!openTabs[newTab]) return logger.error("Cannot move to nonexistent tab with index " + newTab, openTabs);
    moveToTab(openTabs[newTab].id);
}

const saveTabs = async (userId: string) => {
    if (!userId) return;
    DataStore.update<PersistedTabs>("ChannelTabs_openChannels_v2", old => {
        return {
            ...(old ?? {}),
            [userId]: { openTabs, openTabIndex: openTabs.findIndex(t => t.id === currentlyOpenTab) }
        };
    });
};

function setOpenTab(id: number) {
    const i = openTabs.findIndex(v => v.id === id);
    if (i === -1) return logger.error("Couldn't find channel tab with ID " + id, openTabs);
    currentlyOpenTab = id;
    openTabHistory.push(id);
}

function openStartupTabs(props: BasicChannelTabsProps & { userId: string; }, update: () => void) {
    const { userId } = props;
    if (lastUserId && lastUserId !== userId) {
        replaceArray(openTabs);
        replaceArray(openTabHistory);
        i = 0;
    }
    if (!userId) return;
    lastUserId = userId;
    if (openTabs.length) return;
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
            DataStore.get<PersistedTabs>("ChannelTabs_openChannels_v2").then(tabs => {
                const t = tabs?.[userId];
                if (!t) return;
                replaceArray(openTabs);
                t.openTabs.forEach(tab => createTab(tab));
                currentlyOpenTab = openTabs.find((_, i) => i === t.openTabIndex)!.id;
                moveToTab(currentlyOpenTab);
                update();
            });
            break;
        }
        case "preset": {
            const tabs = channelTabsSettings.store.tabSet?.[userId];
            if (!tabs) break;
            tabs.forEach(t => createTab(t));
            setOpenTab(0);
            break;
        }
    }
    if (!openTabs.length) createTab({ channelId: props.channelId, guildId: props.guildId }, true);
    for (let i = 0; i < openTabHistory.length; i++) openTabHistory.pop();
    moveToTab(currentlyOpenTab);
    update();
}

function reopenClosedTab() {
    if (!closedTabs.length) return;
    const tab = closedTabs.pop()!;
    createTab(tab, true);
}

function moveDraggedTabs(index1: number, index2: number) {
    if (index1 < 0 || index2 > openTabs.length)
        return logger.error(`Out of bounds drag (swap between indexes ${index1} and ${index2})`, openTabs);
    const firstItem = openTabs.splice(index1, 1)[0];
    openTabs.splice(index2, 0, firstItem);
}

export const ChannelTabsUtils = {
    closeOtherTabs, closeTab, closeCurrentTab, closeTabsToTheRight, createTab, handleChannelSwitch, isTabSelected,
    moveDraggedTabs, moveToTab, moveToTabRelative, openTabHistory, openTabs, saveTabs, openStartupTabs, reopenClosedTab
};
