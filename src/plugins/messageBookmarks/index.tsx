/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { Channel, Message } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { Forms, Menu, showToast, Toasts, Tooltip } from "@webpack/common";

import { openMessageBookmarksModal } from "./modal";
import { addBookmark, didLoadBookmarkIndex, isMessageBookmarked, loadBookmarkIndex, removeBookmark, resetBookmarksStore } from "./store";

const BookmarkIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        width={width}
        height={height}
        className={className}
    >
        <path d="M6 3a3 3 0 0 0-3 3v15l9-5 9 5V6a3 3 0 0 0-3-3H6Zm0 2h12a1 1 0 0 1 1 1v11.62l-7-3.89-7 3.89V6a1 1 0 0 1 1-1Z" />
    </svg>
);

const ActionButtonClasses = findCssClassesLazy("actionButton", "highlight");

const settings = definePluginSettings({
    openBookmarks: {
        type: OptionType.COMPONENT,
        component: () => (
            <>
                <Forms.FormText>
                    Bookmarks are stored locally in Vencord DataStore and never leave your client.
                </Forms.FormText>
                <Button onClick={openMessageBookmarksModal}>
                    Open Message Bookmarks
                </Button>
            </>
        )
    }
});

function getContextMenuGroup(children: any[]) {
    return findGroupChildrenByChildId("copy-text", children)
        ?? findGroupChildrenByChildId("copy-link", children)
        ?? findGroupChildrenByChildId("devmode-copy-id", children, true);
}

async function handleAddBookmark(message: Message, channel?: Channel) {
    const result = await addBookmark(message, channel?.guild_id ?? undefined);
    if (result === "duplicate") {
        showToast("That message is already bookmarked.", Toasts.Type.MESSAGE);
        return;
    }

    showToast("Message bookmarked.", Toasts.Type.SUCCESS);
}

async function handleRemoveBookmark(messageId: string) {
    if (await removeBookmark(messageId)) {
        showToast("Bookmark removed.", Toasts.Type.SUCCESS);
        return;
    }

    showToast("That message is not bookmarked.", Toasts.Type.MESSAGE);
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { channel, message }: { channel?: Channel; message: Message; }) => {
    void loadBookmarkIndex();

    const hasLoaded = didLoadBookmarkIndex();
    const isBookmarked = hasLoaded && isMessageBookmarked(message.id);
    const item = (
        <Menu.MenuItem
            id={isBookmarked ? "vc-remove-bookmark-message" : "vc-bookmark-message"}
            label={isBookmarked ? "Remove Bookmark" : "Bookmark Message"}
            icon={BookmarkIcon}
            action={() => isBookmarked ? handleRemoveBookmark(message.id) : handleAddBookmark(message, channel)}
        />
    );

    const group = getContextMenuGroup(children);
    if (group) {
        group.push(item);
        return;
    }

    children.push(
        <Menu.MenuGroup>
            {item}
        </Menu.MenuGroup>
    );
};

export default definePlugin({
    name: "MessageBookmarks",
    description: "Bookmark messages locally and browse them later from a dedicated local bookmarks view.",
    searchTerms: ["bookmark", "bookmarks", "saved messages"],
    tags: ["Chat", "Organisation", "Utility"],
    authors: [Devs.almostkoi],
    settings,
    contextMenus: {
        "message": messageContextMenuPatch
    },
    patches: [
        {
            find: "Missing channel in Channel.renderHeaderToolbar",
            replacement: [
                {
                    match: /(?<=renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_TEXT:.+?)(\i)\.push\(.{0,80}?channel:(\i)},"notifications"\)\)/,
                    replace: (match, buttons, channel) => `${match};${buttons}.push($self.renderToolbarButton({channel:${channel}}))`
                },
                {
                    match: /(?<=renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_MEDIA:.+?)(\i)\.push\(.{0,80}?channel:(\i)},"notifications"\)\)/,
                    replace: (match, buttons, channel) => `${match};${buttons}.push($self.renderToolbarButton({channel:${channel}}))`
                },
                {
                    match: /(?<=renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.DM:.+?)(\i)\.push\(.{0,120}?channel:(\i)},"[^"]+"\)\)/,
                    replace: (match, buttons, channel) => `${match};${buttons}.push($self.renderToolbarButton({channel:${channel}}))`
                },
                {
                    match: /(?<=renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GROUP_DM:.+?)(\i)\.push\(.{0,120}?channel:(\i)},"[^"]+"\)\)/,
                    replace: (match, buttons, channel) => `${match};${buttons}.push($self.renderToolbarButton({channel:${channel}}))`
                }
            ]
        }
    ],
    toolboxActions: {
        "Open Bookmarks": openMessageBookmarksModal
    },

    stop() {
        resetBookmarksStore();
    },

    renderToolbarButton: ErrorBoundary.wrap(({ channel }: { channel?: Channel; }) => {
        if (!channel) return null;

        return (
            <Tooltip text="Open Message Bookmarks">
                {tooltipProps => (
                    <div
                        {...tooltipProps}
                        role="button"
                        aria-label="Open Message Bookmarks"
                        aria-haspopup="dialog"
                        onClick={openMessageBookmarksModal}
                        className={classes(ActionButtonClasses.actionButton, "vc-messageBookmarks-toolbar")}
                    >
                        <BookmarkIcon width={20} height={20} className="vc-messageBookmarks-toolbar-icon" />
                    </div>
                )}
            </Tooltip>
        );
    }, { noop: true })
});
