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

import { filters, mapMangledModuleLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, i18n, Menu, ReadStateStore, showToast, useState } from "@webpack/common";

import { Bookmarks, ChannelTabsProps, channelTabsSettings as settings, ChannelTabsUtils, UseBookmark } from "../util";

const { closeOtherTabs, closeTab, closeTabsToTheRight, toggleCompactTab } = ChannelTabsUtils;

const ReadStateUtils = mapMangledModuleLazy('"ENABLE_AUTOMATIC_ACK",', {
    markAsRead: filters.byCode(".getActiveJoinedThreadsForParent")
});

export function BasicContextMenu() {
    const { showBookmarkBar } = settings.use(["showBookmarkBar"]);

    return <Menu.Menu
        navId="channeltabs-context"
        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        aria-label="ChannelTabs Context Menu"
    >
        <Menu.MenuGroup>
            <Menu.MenuCheckboxItem
                checked={showBookmarkBar}
                key="show-bookmark-bar"
                id="show-bookmark-bar"
                label="Bookmark Bar"
                action={() => {
                    settings.store.showBookmarkBar = !settings.store.showBookmarkBar;
                }}
            />
        </Menu.MenuGroup>
    </Menu.Menu>;
}

export function BookmarkBarContextMenu() {
    const { showBookmarkBar } = settings.use(["showBookmarkBar"]);

    return <Menu.Menu
        navId="channeltabs-bookmark-bar-context"
        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        aria-label="ChannelTabs Bookmark Bar Context Menu"
    >
        <Menu.MenuGroup>
            <Menu.MenuItem
                key="create-folder"
                id="create-folder"
                label="Create Folder"
                action={() => showToast("TODO")}
            />
        </Menu.MenuGroup>
        <Menu.MenuGroup>
            <Menu.MenuCheckboxItem
                checked={showBookmarkBar}
                key="show-bookmark-bar"
                id="show-bookmark-bar"
                label="Bookmark Bar"
                action={() => {
                    settings.store.showBookmarkBar = !settings.store.showBookmarkBar;
                }}
            />
        </Menu.MenuGroup>
    </Menu.Menu>;
}

export function BookmarkContextMenu({ bookmark, methods }: { bookmark: Bookmarks[number], methods: UseBookmark[1]; }) {
    const { showBookmarkBar } = settings.use(["showBookmarkBar"]);

    return <Menu.Menu
        navId="channeltabs-bookmark-context"
        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        aria-label="ChannelTabs Bookmark Context Menu"
    >
        {"bookmarks" in bookmark
            ? <></> // TODO
            : <Menu.MenuGroup>
                <Menu.MenuItem
                    key="edit-bookmark"
                    id="edit-bookmark"
                    label="Edit Bookmark"
                    action={() => showToast("TODO")}
                />
                <Menu.MenuItem
                    key="delete-bookmark"
                    id="delete-bookmark"
                    label="Delete Bookmark"
                    action={() => methods.deleteBookmark(bookmark.channelId)}
                />
                <Menu.MenuItem
                    key="add-to-folder"
                    id="add-to-folder"
                    label="Add Bookmark to Folder"
                    action={() => showToast("TODO")}
                />
            </Menu.MenuGroup>
        }
        <Menu.MenuGroup>
            <Menu.MenuCheckboxItem
                checked={showBookmarkBar}
                key="show-bookmark-bar"
                id="show-bookmark-bar"
                label="Bookmark Bar"
                action={() => {
                    settings.store.showBookmarkBar = !settings.store.showBookmarkBar;
                }}
            />
        </Menu.MenuGroup>
    </Menu.Menu>;
}

export function TabContextMenu({ tab }: { tab: ChannelTabsProps; }) {
    const channel = ChannelStore.getChannel(tab.channelId);
    const { openTabs } = ChannelTabsUtils;
    const [compact, setCompact] = useState(tab.compact);
    const { showBookmarkBar } = settings.use(["showBookmarkBar"]);

    return <Menu.Menu
        navId="channeltabs-tab-context"
        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        aria-label="ChannelTabs Tab Context Menu"
    >
        <Menu.MenuGroup>
            {channel &&
                <Menu.MenuItem
                    key="mark-as-read"
                    id="mark-as-read"
                    label={i18n.Messages.MARK_AS_READ}
                    disabled={!ReadStateStore.hasUnread(channel.id)}
                    action={() => ReadStateUtils.markAsRead(channel)}
                />
            }
            <Menu.MenuCheckboxItem
                checked={compact}
                key="toggle-compact-tab"
                id="toggle-compact-tab"
                label="Compact"
                action={() => {
                    setCompact(compact => !compact);
                    toggleCompactTab(tab.id);
                    // FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" });
                }}
            />
        </Menu.MenuGroup>
        {openTabs.length !== 1 && <Menu.MenuGroup>
            <Menu.MenuItem
                key="close-tab"
                id="close-tab"
                label="Close Tab"
                action={() => closeTab(tab.id)}
            />
            <Menu.MenuItem
                key="close-other-tabs"
                id="close-other-tabs"
                label="Close Other Tabs"
                action={() => closeOtherTabs(tab.id)}
            />
            <Menu.MenuItem
                key="close-right-tabs"
                id="close-right-tabs"
                label="Close Tabs to the Right"
                disabled={openTabs.indexOf(tab) === openTabs.length - 1}
                action={() => closeTabsToTheRight(tab.id)}
            />
        </Menu.MenuGroup>}
        <Menu.MenuGroup>
            <Menu.MenuCheckboxItem
                checked={showBookmarkBar}
                key="show-bookmark-bar"
                id="show-bookmark-bar"
                label="Bookmark Bar"
                action={() => {
                    settings.store.showBookmarkBar = !settings.store.showBookmarkBar;
                }}
            />
        </Menu.MenuGroup>
    </Menu.Menu>;
}
