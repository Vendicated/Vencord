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

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { OptionType } from "@utils/types";
import { NavigationRouter, SelectedChannelStore, SelectedGuildStore, Toasts } from "@webpack/common";

import { ChannelTabsPreview } from "./components.jsx";

export type BasicChannelTabsProps = {
    guildId: string;
    channelId: string;
};
export interface ChannelTabsProps extends BasicChannelTabsProps {
    compact: boolean;
    messageId?: string;
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
        component: ChannelTabsPreview,
        description: "Select which tabs to open at startup",
        type: OptionType.COMPONENT,
        default: {}
    },
    noPomeloNames: {
        description: "Use display names instead of usernames for DM's",
        type: OptionType.BOOLEAN,
        default: false
    },
    showStatusIndicators: {
        description: "Show status indicators for DM's",
        type: OptionType.BOOLEAN,
        default: true
    },
    showChannelEmojis: {
        description: "Show channel emojis",
        type: OptionType.BOOLEAN,
        default: true
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
let persistedTabs: Promise<PersistedTabs | undefined>;

let lastUserId: string;

let update = () => {
    logger.warn("Update function not set");
};

// Takes BasicChannelTabsProps on creation but ChannelTabsProps when restoring existing tabs
function createTab(props: BasicChannelTabsProps | ChannelTabsProps, switchToTab?: boolean, messageId?: string) {
    const id = genId();
    openTabs.push({ ...props, id, messageId, compact: "compact" in props ? props.compact : false });
    if (switchToTab) moveToTab(id);
    update();
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
    update();
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
    else update();
}

function closeTabsToTheRight(id: number) {
    const i = openTabs.findIndex(v => v.id === id);
    if (i === -1) return logger.error("Couldn't find channel tab with ID " + id, openTabs);

    const tabsToTheRight = openTabs.filter((_, ind) => ind > i);
    closedTabs.push(...tabsToTheRight.reverse());
    const tabsToTheLeft = openTabs.filter((_, ind) => ind <= i);
    replaceArray(openTabs, ...tabsToTheLeft);

    if (!tabsToTheLeft.some(v => v.id === currentlyOpenTab)) moveToTab(openTabs.at(-1)!.id);
    else update();
}

function handleChannelSwitch(ch: BasicChannelTabsProps) {
    const tab = openTabs.find(c => c.id === currentlyOpenTab)!;
    if (tab === undefined) return logger.error("Couldn't find the currently open channel " + currentlyOpenTab, openTabs);

    if (tab.channelId !== ch.channelId) openTabs[openTabs.indexOf(tab)] = { id: tab.id, compact: tab.compact, ...ch };
}

function handleKeybinds(e: KeyboardEvent) {
    if (e.key === "Tab" && e.ctrlKey) {
        const currentIndex = openTabs.findIndex(c => c.id === currentlyOpenTab);
        const direction = e.shiftKey ? -1 : 1;
        const maybeNewTab = currentIndex + direction;

        const newTab = maybeNewTab < 0
            ? openTabs.length + direction
            : maybeNewTab > openTabs.length - 1
                ? maybeNewTab - openTabs.length
                : maybeNewTab;
        if (!openTabs[newTab]) return logger.error("Cannot move to nonexistent tab with index " + newTab, openTabs);

        moveToTab(openTabs[newTab].id);
    }
    // Ctrl+T is taken by discord
    else if (["N", "n"].includes(e.key) && e.ctrlKey) {
        createTab(openTabs.find(t => t.id === currentlyOpenTab)!);
    }
    else if (["W", "w"].includes(e.key) && e.ctrlKey) {
        closeTab(currentlyOpenTab);
    }
    else if (["T", "t"].includes(e.key) && e.ctrlKey && e.shiftKey) {
        if (!closedTabs.length) return;
        const tab = closedTabs.pop()!;
        createTab(tab, true);
    }
}

function isTabSelected(id: number) {
    return id === currentlyOpenTab;
}

function moveDraggedTabs(index1: number, index2: number) {
    if (index1 < 0 || index2 > openTabs.length)
        return logger.error(`Out of bounds drag (swap between indexes ${index1} and ${index2})`, openTabs);

    const firstItem = openTabs.splice(index1, 1)[0];
    openTabs.splice(index2, 0, firstItem);
    update();
}

function moveToTab(id: number) {
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

function openStartupTabs(props: BasicChannelTabsProps & { userId: string; }) {
    const { userId } = props;
    persistedTabs ??= DataStore.get("ChannelTabs_openChannels_v2");
    replaceArray(openTabs);
    replaceArray(openTabHistory);
    i = 0;

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
            persistedTabs.then(tabs => {
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

function setUpdaterFunction(fn: () => void) {
    update = fn;
}

function toggleCompactTab(id: number) {
    const i = openTabs.findIndex(v => v.id === id);
    if (i === -1) return logger.error("Couldn't find channel tab with ID " + id, openTabs);

    openTabs[i] = {
        ...openTabs[i],
        compact: !openTabs[i].compact
    };
    update();
}

export const ChannelTabsUtils = {
    closeOtherTabs, closeTab, closeTabsToTheRight, createTab, handleChannelSwitch,
    handleKeybinds, isTabSelected, moveDraggedTabs, moveToTab, openTabHistory,
    openTabs, saveTabs, openStartupTabs, setUpdaterFunction, toggleCompactTab
};
