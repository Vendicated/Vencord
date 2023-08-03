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

import { Margins } from "@utils/margins.js";
import { ModalContent, ModalHeader, ModalRoot, openModal } from "@utils/modal.jsx";
import { filters, mapMangledModuleLazy } from "@webpack";
import { Button, ChannelStore, FluxDispatcher, Forms, i18n, Menu, ReadStateStore, showToast, TextInput, useState } from "@webpack/common";

import { Bookmarks, ChannelTabsProps, channelTabsSettings as settings, ChannelTabsUtils, UseBookmark } from "../util";
import { bookmarkName } from "./BookmarkContainer";

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

function EditModal({ modalProps, originalName, channelId, onSave }) {
    const [name, setName] = useState(originalName);
    const channel = ChannelStore.getChannel(channelId);
    const placeholder = bookmarkName(channel);

    return <ModalRoot {...modalProps}>
        <ModalHeader>
            <Forms.FormText variant="heading-lg/semibold">Edit Bookmark</Forms.FormText>
        </ModalHeader>
        <ModalContent>
            <Forms.FormTitle className={Margins.top20}>Bookmark Name</Forms.FormTitle>
            <TextInput
                value={name === placeholder ? undefined : name}
                placeholder={placeholder}
                onChange={v => setName(v)}
            />
            <Button
                className={Margins.top16}
                onClick={() => onSave(name || bookmarkName(channel))}
            >Save</Button>
        </ModalContent>
    </ModalRoot>;
}

export function BookmarkContextMenu({ bookmarks, index, methods }: { bookmarks: Bookmarks, index: number, methods: UseBookmark[1]; }) {
    const { showBookmarkBar } = settings.use(["showBookmarkBar"]);
    const bookmark = bookmarks[index];

    return <Menu.Menu
        navId="channeltabs-bookmark-context"
        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        aria-label="ChannelTabs Bookmark Context Menu"
    >
        <Menu.MenuGroup>
            <Menu.MenuItem
                key="edit-bookmark"
                id="edit-bookmark"
                label="Edit Bookmark"
                action={() => {
                    if ("bookmarks" in bookmark) return showToast("TODO");
                    const key = openModal(modalProps =>
                        <EditModal
                            modalProps={modalProps}
                            originalName={bookmark.name}
                            channelId={bookmark.channelId}
                            onSave={name => methods.editBookmark(index, { name }, key)}
                        />
                    );
                }}
            />
            <Menu.MenuItem
                key="delete-bookmark"
                id="delete-bookmark"
                label="Delete Bookmark"
                action={() => methods.deleteBookmark(index)}
            />
            <Menu.MenuItem
                key="add-to-folder"
                id="add-to-folder"
                label="Add Bookmark to Folder"
                disabled={"bookmarks" in bookmark}
                action={() => methods.addFolder()}
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
