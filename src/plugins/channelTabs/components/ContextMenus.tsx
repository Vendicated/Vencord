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

import { Margins } from "@utils/margins";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { Button, ChannelStore, FluxDispatcher, Forms, i18n, Menu, ReadStateStore, Select, Text, TextInput, useState } from "@webpack/common";

import { ackChannel, Bookmark, bookmarkFolderColors, Bookmarks, ChannelTabsProps, channelTabsSettings as settings, ChannelTabsUtils, UseBookmark } from "../util";

const { bookmarkPlaceholderName, closeOtherTabs, closeTab, closeTabsToTheRight, toggleCompactTab, reopenClosedTab } = ChannelTabsUtils;

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

export function EditModal({ modalProps, modalKey, bookmark, onSave }) {
    const [name, setName] = useState(bookmark.name);
    const [color, setColor] = useState(bookmark.iconColor);
    const placeholder = bookmarkPlaceholderName(bookmark);

    return <ModalRoot {...modalProps}>
        <ModalHeader>
            <Text variant="heading-lg/semibold">Edit Bookmark</Text>
        </ModalHeader>
        <ModalContent>
            <Forms.FormTitle className={Margins.top16}>Bookmark Name</Forms.FormTitle>
            <TextInput
                value={name === placeholder ? undefined : name}
                placeholder={placeholder}
                onChange={v => setName(v)}
            />
            {"bookmarks" in bookmark && <>
                <Forms.FormTitle className={Margins.top16}>Folder Color</Forms.FormTitle>
                <Select
                    options={
                        Object.entries(bookmarkFolderColors).map(([name, value]) => ({
                            label: name,
                            value,
                            default: bookmark.iconColor === value
                        }))
                    }
                    isSelected={v => color === v}
                    select={setColor}
                    serialize={String}
                />
            </>}
        </ModalContent>
        <ModalFooter>
            <Button
                onClick={() => onSave(name || placeholder, color)}
            >Save</Button>
            <Button
                color={Button.Colors.TRANSPARENT}
                look={Button.Looks.LINK}
                onClick={() => closeModal(modalKey)}
            >Cancel</Button>
        </ModalFooter>
    </ModalRoot>;
}

function AddToFolderModal({ modalProps, modalKey, bookmarks, onSave }: {
    modalProps: any,
    modalKey: string,
    bookmarks: Bookmarks,
    onSave: (folderIndex: number) => void;
}) {
    const [folderIndex, setIndex] = useState(-1);

    return <ModalRoot {...modalProps}>
        <ModalHeader>
            <Text variant="heading-lg/semibold">Add Bookmark to Folder</Text>
        </ModalHeader>
        <ModalContent>
            <Forms.FormTitle className={Margins.top16}>Select a folder</Forms.FormTitle>
            <Select
                options={[...Object.entries(bookmarks).map(([index, bookmark]) => ({
                    label: bookmark.name,
                    value: parseInt(index, 10),
                    _isFolder: "bookmarks" in bookmark
                })).filter(v => v._isFolder).map(({ label, value }) => ({ label, value })),
                {
                    label: "Create one",
                    value: -1,
                    default: true
                }]}
                isSelected={v => v === folderIndex}
                select={setIndex}
                serialize={String}
            />
        </ModalContent>
        <ModalFooter>
            <Button
                onClick={() => onSave(folderIndex)}
            >Save</Button>
            <Button
                color={Button.Colors.TRANSPARENT}
                look={Button.Looks.LINK}
                onClick={() => closeModal(modalKey)}
            >Cancel</Button>
        </ModalFooter>
    </ModalRoot>;
}

function DeleteFolderConfirmationModal({ modalProps, modalKey, onConfirm }) {
    return <ModalRoot {...modalProps}>
        <ModalHeader>
            <Text variant="heading-lg/semibold">Are you sure?</Text>
        </ModalHeader>
        <ModalContent>
            <Forms.FormText className={Margins.top16}>
                Deleting a bookmark folder will also delete all bookmarks within it.
            </Forms.FormText>
        </ModalContent>
        <ModalFooter>
            <Button
                color={Button.Colors.RED}
                onClick={onConfirm}
            >
                Yes
            </Button>
            <Button
                color={Button.Colors.TRANSPARENT}
                look={Button.Looks.LINK}
                onClick={() => closeModal(modalKey)}
            >
                No
            </Button>
        </ModalFooter>
    </ModalRoot>;
}

export function BookmarkContextMenu({ bookmarks, index, methods }: { bookmarks: Bookmarks, index: number, methods: UseBookmark[1]; }) {
    const { showBookmarkBar, bookmarkNotificationDot } = settings.use(["showBookmarkBar", "bookmarkNotificationDot"]);
    const bookmark = bookmarks[index];
    const isFolder = "bookmarks" in bookmark;

    return <Menu.Menu
        navId="channeltabs-bookmark-context"
        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        aria-label="ChannelTabs Bookmark Context Menu"
    >
        {bookmarkNotificationDot && !isFolder && <Menu.MenuGroup>
            <Menu.MenuItem
                key="mark-as-read"
                id="mark-as-read"
                label={i18n.Messages.MARK_AS_READ}
                disabled={!ReadStateStore.hasUnread(bookmark.channelId)}
                action={() => ackChannel(ChannelStore.getChannel(bookmark.channelId))}
            />
        </Menu.MenuGroup>}
        <Menu.MenuGroup>
            <Menu.MenuItem
                key="edit-bookmark"
                id="edit-bookmark"
                label="Edit Bookmark"
                action={() => {
                    const key = openModal(modalProps =>
                        <EditModal
                            modalProps={modalProps}
                            modalKey={key}
                            bookmark={bookmark}
                            onSave={(name, color) => {
                                methods.editBookmark(index, { name });
                                if (color) methods.editBookmark(index, { iconColor: color });
                                closeModal(key);
                            }
                            }
                        />
                    );
                }}
            />
            <Menu.MenuItem
                key="delete-bookmark"
                id="delete-bookmark"
                label="Delete Bookmark"
                action={() => {
                    if (isFolder) {
                        const key = openModal(modalProps =>
                            <DeleteFolderConfirmationModal
                                modalProps={modalProps}
                                modalKey={key}
                                onConfirm={() => {
                                    methods.deleteBookmark(index);
                                    closeModal(key);
                                }}
                            />);
                    }
                    else methods.deleteBookmark(index);
                }}
            />
            <Menu.MenuItem
                key="add-to-folder"
                id="add-to-folder"
                label="Add Bookmark to Folder"
                disabled={isFolder}
                action={() => {
                    const key = openModal(modalProps =>
                        <AddToFolderModal
                            modalProps={modalProps}
                            modalKey={key}
                            bookmarks={bookmarks}
                            onSave={index => {
                                if (index === -1) {
                                    const folderIndex = methods.addFolder();
                                    methods.addBookmark(bookmark as Bookmark, folderIndex);
                                }
                                else methods.addBookmark(bookmark as Bookmark, index);
                                methods.deleteBookmark(bookmarks.indexOf(bookmark));
                                closeModal(key);
                            }
                            }
                        />
                    );
                }}
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
    const { openTabs, closedTabs } = ChannelTabsUtils;
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
                    action={() => ackChannel(channel)}
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
            <Menu.MenuItem
                key="reopen-closed-tab"
                id="reopen-closed-tab"
                label="Reopen Closed Tab"
                disabled={!(closedTabs.length)}
                action={() => reopenClosedTab()}
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
