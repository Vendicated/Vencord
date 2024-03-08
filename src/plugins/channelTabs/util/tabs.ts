/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { NavigationRouter, SelectedChannelStore, SelectedGuildStore, showToast, Toasts } from "@webpack/common";

import { logger, settings } from "./constants";
import { BasicChannelTabsProps, ChannelTabsProps, PersistedTabs } from "./types";

function replaceArray<T>(array: T[], ...values: T[]) {
    const len = array.length;
    for (let i = 0; i < len; i++) array.pop();
    array.push(...values);
}

let highestIdIndex = 0;
const genId = () => highestIdIndex++;

const openTabs: ChannelTabsProps[] = [];
const closedTabs: ChannelTabsProps[] = [];
let currentlyOpenTab: number;
const openTabHistory: number[] = [];
let persistedTabs: Promise<PersistedTabs | undefined>;

// horror
const _ = {
    get openedTabs() {
        return openTabs;
    }
};
export const { openedTabs } = _;

let update = (save = true) => {
    logger.warn("Update function not set");
};

export function createTab(props: BasicChannelTabsProps | ChannelTabsProps, switchToTab?: boolean, messageId?: string, save = true) {
    const id = genId();
    openTabs.push({ ...props, id, messageId, compact: "compact" in props ? props.compact : false });
    if (switchToTab) moveToTab(id);
    update(save);
}

export function closeTab(id: number) {
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
    update();
}

export function closeOtherTabs(id: number) {
    const tab = openTabs.find(v => v.id === id);
    if (tab === undefined) return logger.error("Couldn't find channel tab with ID " + id, openTabs);

    const removedTabs = openTabs.filter(v => v.id !== id);
    closedTabs.push(...removedTabs.reverse());
    const lastTab = openTabs.find(v => v.id === currentlyOpenTab)!;
    replaceArray(openTabs, tab);
    setOpenTab(id);
    replaceArray(openTabHistory, id);

    if (tab.channelId !== lastTab.channelId) moveToTab(id);
    else update();
}

export function closeTabsToTheRight(id: number) {
    const i = openTabs.findIndex(v => v.id === id);
    if (i === -1) return logger.error("Couldn't find channel tab with ID " + id, openTabs);

    const tabsToTheRight = openTabs.filter((_, ind) => ind > i);
    closedTabs.push(...tabsToTheRight.reverse());
    const tabsToTheLeft = openTabs.filter((_, ind) => ind <= i);
    replaceArray(openTabs, ...tabsToTheLeft);

    if (!tabsToTheLeft.some(v => v.id === currentlyOpenTab)) moveToTab(openTabs.at(-1)!.id);
    else update();
}

export function handleChannelSwitch(ch: BasicChannelTabsProps) {
    const tab = openTabs.find(c => c.id === currentlyOpenTab);
    if (tab === undefined) return logger.error("Couldn't find the currently open channel " + currentlyOpenTab, openTabs);

    if (tab.channelId !== ch.channelId) openTabs[openTabs.indexOf(tab)] = { id: tab.id, compact: tab.compact, ...ch };
}

export function hasClosedTabs() {
    return !!closedTabs.length;
}

export function isTabSelected(id: number) {
    return id === currentlyOpenTab;
}

export function moveDraggedTabs(index1: number, index2: number) {
    if (index1 < 0 || index2 > openTabs.length)
        return logger.error(`Out of bounds drag (swap between indexes ${index1} and ${index2})`, openTabs);

    const firstItem = openTabs.splice(index1, 1)[0];
    openTabs.splice(index2, 0, firstItem);
    update();
}

export function moveToTab(id: number) {
    const tab = openTabs.find(v => v.id === id);
    if (tab === undefined) return logger.error("Couldn't find channel tab with ID " + id, openTabs);

    setOpenTab(id);
    if (tab.messageId) {
        NavigationRouter.transitionTo(`/channels/${tab.guildId}/${tab.channelId}/${tab.messageId}`);
        delete openTabs[openTabs.indexOf(tab)].messageId;
    }
    else if (tab.channelId !== SelectedChannelStore.getChannelId() || tab.guildId !== SelectedGuildStore.getGuildId())
        NavigationRouter.transitionToGuild(tab.guildId, tab.channelId);
    else update();
}

export function openStartupTabs(props: BasicChannelTabsProps & { userId: string; }, setUserId: (id: string) => void) {
    const { userId } = props;
    persistedTabs ??= DataStore.get("ChannelTabs_openChannels_v2");
    replaceArray(openTabs);
    replaceArray(openTabHistory);
    highestIdIndex = 0;

    if (settings.store.onStartup !== "nothing" && Vencord.Plugins.isPluginEnabled("KeepCurrentChannel"))
        return showToast("Not restoring tabs as KeepCurrentChannel is enabled", Toasts.Type.FAILURE);

    switch (settings.store.onStartup) {
        case "remember": {
            persistedTabs.then(tabs => {
                const t = tabs?.[userId];
                if (!t) {
                    createTab({ channelId: props.channelId, guildId: props.guildId }, true);
                    return showToast("Failed to restore tabs", Toasts.Type.FAILURE);
                }
                replaceArray(openTabs); // empty the array
                t.openTabs.forEach(tab => createTab(tab));
                currentlyOpenTab = openTabs[t.openTabIndex]?.id ?? 0;

                setUserId(userId);
                moveToTab(currentlyOpenTab);
            });
            break;
        }
        case "preset": {
            const tabs = settings.store.tabSet?.[userId];
            if (!tabs) break;
            tabs.forEach(t => createTab(t));
            setOpenTab(0);
            setUserId(userId);
            break;
        }
        default: {
            setUserId(userId);
        }
    }

    if (!openTabs.length) createTab({ channelId: props.channelId, guildId: props.guildId }, true, undefined, false);
    for (let i = 0; i < openTabHistory.length; i++) openTabHistory.pop();
    moveToTab(currentlyOpenTab);
}

export function reopenClosedTab() {
    if (!closedTabs.length) return;
    const tab = closedTabs.pop()!;
    createTab(tab, true);
}

export const saveTabs = async (userId: string) => {
    if (!userId) return;

    DataStore.update<PersistedTabs>("ChannelTabs_openChannels_v2", old => {
        return {
            ...(old ?? {}),
            [userId]: { openTabs, openTabIndex: openTabs.findIndex(t => t.id === currentlyOpenTab) }
        };
    });
};

export function setOpenTab(id: number) {
    const i = openTabs.findIndex(v => v.id === id);
    if (i === -1) return logger.error("Couldn't find channel tab with ID " + id, openTabs);

    currentlyOpenTab = id;
    openTabHistory.push(id);
}

export function setUpdaterFunction(fn: () => void) {
    update = fn;
}

export function switchChannel(ch: BasicChannelTabsProps) {
    handleChannelSwitch(ch);
    moveToTab(openTabs.find(t => t.id === currentlyOpenTab)!.id);
}

export function toggleCompactTab(id: number) {
    const i = openTabs.findIndex(v => v.id === id);
    if (i === -1) return logger.error("Couldn't find channel tab with ID " + id, openTabs);

    openTabs[i] = {
        ...openTabs[i],
        compact: !openTabs[i].compact
    };
    update();
}
