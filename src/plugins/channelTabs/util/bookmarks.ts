/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { useAwaiter } from "@utils/react";
import { ChannelStore, useCallback, UserStore, useState } from "@webpack/common";

import { bookmarkFolderColors, logger } from "./constants";
import { Bookmark, BookmarkFolder, Bookmarks, UseBookmark, UseBookmarkMethods } from "./types";

export function isBookmarkFolder(bookmark: Bookmark | BookmarkFolder): bookmark is BookmarkFolder {
    return "bookmarks" in bookmark;
}

export function bookmarkPlaceholderName(bookmark: Omit<Bookmark | BookmarkFolder, "name">) {
    if (isBookmarkFolder(bookmark as Bookmark | BookmarkFolder)) return "Folder";
    const channel = ChannelStore.getChannel((bookmark as Bookmark).channelId);

    if (!channel) return "Bookmark";
    if (channel.name) return `#${channel.name}`;
    if (channel.recipients) return UserStore.getUser(channel.recipients?.[0])?.username
        ?? "Unknown User";
    return "Bookmark";
}

export function useBookmarks(userId: string): UseBookmark {
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

            if (typeof folderIndex === "number" && !(isBookmarkFolder(bookmarks[userId][folderIndex])))
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
    } as UseBookmarkMethods;

    return [bookmarks[userId], methods];
}
