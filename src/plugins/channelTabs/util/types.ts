/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type BasicChannelTabsProps = {
    guildId: string;
    channelId: string;
};
export interface ChannelTabsProps extends BasicChannelTabsProps {
    compact: boolean;
    messageId?: string;
    id: number;
}
export interface PersistedTabs {
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
    methods: UseBookmarkMethods;
}
export type Bookmarks = (Bookmark | BookmarkFolder)[];
export type UseBookmarkMethods = {
    addBookmark: (bookmark: Omit<Bookmark, "name"> & { name?: string; }, folderIndex?: number) => void;
    addFolder: () => number;
    deleteBookmark: (index: number, folderIndex?: number) => void;
    editBookmark: (index: number, bookmark: Partial<Bookmark | BookmarkFolder>, modalKey?) => void;
    moveDraggedBookmarks: (index1: number, index2: number) => void;
};
export type UseBookmark = [Bookmarks | undefined, UseBookmarkMethods];
