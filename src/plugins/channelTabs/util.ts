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
import { useAwaiter } from "@utils/react";
import { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, NavigationRouter, SelectedChannelStore, SelectedGuildStore, showToast, Toasts, useCallback, UserStore, useState } from "@webpack/common";

import { ChannelTabsPreview } from "./components/ChannelTabsContainer";

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

export interface Bookmark {
    channelId: string;
    guildId: string;
    name: string;
}
export interface BookmarkFolder {
    bookmarks: Bookmark[];
    name: string;
    iconColor: string;
}
export interface BookmarkProps {
    bookmarks: Bookmarks,
    index: number,
    methods: UseBookmark[1];
}
export type Bookmarks = (Bookmark | BookmarkFolder)[];
export type UseBookmark = [Bookmarks | undefined, {
    addBookmark: (bookmark: Omit<Bookmark, "name"> & { name?: string; }, folderIndex?: number) => void;
    addFolder: () => number;
    deleteBookmark: (index: number, folderIndex?: number) => void;
    editBookmark: (index: number, bookmark: Partial<Bookmark | BookmarkFolder>, modalKey?) => void;
    moveDraggedBookmarks: (index1: number, index2: number) => void;
}];

const logger = new Logger("ChannelTabs");

export const bookmarkFolderColors = {
    Red: "var(--channeltabs-red)",
    Blue: "var(--channeltabs-blue)",
    Yellow: "var(--channeltabs-yellow)",
    Green: "var(--channeltabs-green)",
    Black: "var(--channeltabs-black)",
    White: "var(--channeltabs-white)",
    Orange: "var(--channeltabs-orange)",
    Pink: "var(--channeltabs-pink)"
} as const;

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
    showBookmarkBar: {
        description: "",
        type: OptionType.BOOLEAN,
        default: true
    },
    bookmarkNotificationDot: {
        description: "Show notification dot for bookmarks",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export const { ackChannel } = findByPropsLazy("ackChannel");
export const { CircleQuestionIcon } = findByPropsLazy("CircleQuestionIcon");

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

let update = (save = true) => {
    logger.warn("Update function not set");
};

function bookmarkPlaceholderName(bookmark: Omit<Bookmark | BookmarkFolder, "name">) {
    if ("bookmarks" in bookmark) return "Folder";
    // @ts-ignore
    const channel = ChannelStore.getChannel(bookmark.channelId);

    if (!channel) return "Bookmark";
    if (channel.name) return `#${channel.name}`;
    if (channel.recipients) return UserStore.getUser(channel.recipients?.[0])?.username
        ?? "Unknown User";
    return "Bookmark";
}

// Takes BasicChannelTabsProps on creation but ChannelTabsProps when restoring existing tabs
function createTab(props: BasicChannelTabsProps | ChannelTabsProps, switchToTab?: boolean, messageId?: string, save = true) {
    const id = genId();
    openTabs.push({ ...props, id, messageId, compact: "compact" in props ? props.compact : false });
    if (switchToTab) moveToTab(id);
    update(save);
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
    const tab = openTabs.find(c => c.id === currentlyOpenTab);
    if (tab === undefined) return logger.error("Couldn't find the currently open channel " + currentlyOpenTab, openTabs);

    if (tab.channelId !== ch.channelId) openTabs[openTabs.indexOf(tab)] = { id: tab.id, compact: tab.compact, ...ch };
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

function openStartupTabs(props: BasicChannelTabsProps & { userId: string; }, setUserId: (id: string) => void) {
    const { userId } = props;
    persistedTabs ??= DataStore.get("ChannelTabs_openChannels_v2");
    replaceArray(openTabs);
    replaceArray(openTabHistory);
    highestIdIndex = 0;

    if (channelTabsSettings.store.onStartup !== "nothing" && Vencord.Plugins.isPluginEnabled("KeepCurrentChannel"))
        return showToast("Not restoring tabs as KeepCurrentChannel is enabled", Toasts.Type.FAILURE);

    switch (channelTabsSettings.store.onStartup) {
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
            const tabs = channelTabsSettings.store.tabSet?.[userId];
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

function reopenClosedTab() {
    if (!closedTabs.length) return;
    const tab = closedTabs.pop()!;
    createTab(tab, true);
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

function setUpdaterFunction(fn: () => void) {
    update = fn;
}

function switchChannel(ch: BasicChannelTabsProps) {
    handleChannelSwitch(ch);
    moveToTab(openTabs.find(t => t.id === currentlyOpenTab)!.id);
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

function useBookmarks(userId: string): UseBookmark {
    const [bookmarks, _setBookmarks] = useState<{ [k: string]: Bookmarks; }>({});
    const setBookmarks = useCallback((bookmarks: { [k: string]: Bookmarks; }) => {
        _setBookmarks(bookmarks);
        DataStore.update("ChannelTabs_bookmarks", old => ({
            ...old,
            [userId]: bookmarks[userId]
        }));
    }, [userId]);

    useAwaiter(() => DataStore.get("ChannelTabs_bookmarks"), {
        fallbackValue: undefined,
        onSuccess(bookmarks: { [k: string]: Bookmarks; }) {
            if (!bookmarks) {
                bookmarks = { [userId]: [] };
                DataStore.set("ChannelTabs_bookmarks", { [userId]: [] });
            }
            if (!bookmarks[userId]) bookmarks[userId] = [];

            setBookmarks(bookmarks);
        },
    });

    const methods = {
        addBookmark: (bookmark, folderIndex) => {
            if (!bookmarks) return;

            if (typeof folderIndex === "number" && !("bookmarks" in bookmarks[userId][folderIndex]))
                return logger.error("Attempted to add bookmark to non-folder " + folderIndex, bookmarks);

            const name = bookmark.name ?? bookmarkPlaceholderName(bookmark);
            if (typeof folderIndex === "number")
                (bookmarks[userId][folderIndex] as BookmarkFolder).bookmarks.push({ ...bookmark, name });
            else bookmarks[userId].push({ ...bookmark, name });

            setBookmarks({
                ...bookmarks
            });
        },
        addFolder() {
            if (!bookmarks) return;
            const length = bookmarks[userId].push({
                name: "Folder",
                iconColor: bookmarkFolderColors.Black,
                bookmarks: []
            });

            setBookmarks({
                ...bookmarks
            });
            return length - 1;
        },
        editBookmark(index, newBookmark) {
            if (!bookmarks) return;
            Object.entries(newBookmark).forEach(([k, v]) => {
                bookmarks[userId][index][k] = v;
            });
            setBookmarks({
                ...bookmarks
            });
        },
        deleteBookmark(index, folderIndex) {
            if (!bookmarks) return;
            if (index < 0 || index > (bookmarks[userId].length - 1))
                return logger.error("Attempted to delete bookmark at index " + index, bookmarks);

            if (typeof folderIndex === "number")
                (bookmarks[userId][folderIndex] as BookmarkFolder).bookmarks.splice(index, 1);
            else bookmarks[userId].splice(index, 1);

            setBookmarks({
                ...bookmarks
            });
        },
        moveDraggedBookmarks(index1, index2) {
            if (index1 < 0 || index2 > bookmarks[userId].length)
                return logger.error(`Out of bounds drag (swap between indexes ${index1} and ${index2})`, bookmarks);

            const firstItem = bookmarks[userId].splice(index1, 1)[0];
            bookmarks[userId].splice(index2, 0, firstItem);

            setBookmarks({
                ...bookmarks
            });
        }
    } as UseBookmark[1];

    return [bookmarks[userId], methods];
}

export const ChannelTabsUtils = {
    bookmarkPlaceholderName, closeOtherTabs, closeTab, closedTabs, closeTabsToTheRight, createTab,
    handleChannelSwitch, isTabSelected, moveDraggedTabs, moveToTab, openTabHistory, openTabs,
    openStartupTabs, reopenClosedTab, saveTabs, setUpdaterFunction, switchChannel, toggleCompactTab, useBookmarks
};
