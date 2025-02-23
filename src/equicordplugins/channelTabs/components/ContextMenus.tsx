/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getIntlMessage } from "@utils/discord";
import { Margins } from "@utils/margins";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Button, ChannelStore, FluxDispatcher, Forms, Menu, ReadStateStore, ReadStateUtils, Select, Text, TextInput, useState } from "@webpack/common";

import { bookmarkFolderColors, bookmarkPlaceholderName, closeOtherTabs, closeTab, closeTabsToTheLeft, closeTabsToTheRight, createTab, hasClosedTabs, isBookmarkFolder, openedTabs, reopenClosedTab, settings, toggleCompactTab } from "../util";
import { Bookmark, BookmarkFolder, Bookmarks, ChannelTabsProps, UseBookmarkMethods } from "../util/types";

export function BasicContextMenu() {
    const { showBookmarkBar } = settings.use(["showBookmarkBar"]);

    return (
        <Menu.Menu
            navId="channeltabs-context"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="ChannelTabs Context Menu"
        >
            <Menu.MenuGroup>
                <Menu.MenuCheckboxItem
                    checked={showBookmarkBar}
                    id="show-bookmark-bar"
                    label="Bookmark Bar"
                    action={() => {
                        settings.store.showBookmarkBar = !settings.store.showBookmarkBar;
                    }}
                />
            </Menu.MenuGroup>
        </Menu.Menu>
    );
}

export function EditModal({ modalProps, modalKey, bookmark, onSave }: {
    modalProps: ModalProps,
    modalKey: string,
    bookmark: Bookmark | BookmarkFolder,
    onSave: (name: string, color: string) => void;
}) {
    const [name, setName] = useState(bookmark.name);
    const [color, setColor] = useState(isBookmarkFolder(bookmark) ? bookmark.iconColor : undefined);
    const placeholder = bookmarkPlaceholderName(bookmark);

    return (
        <ModalRoot {...modalProps}>
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
                {isBookmarkFolder(bookmark) && <>
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
                    onClick={() => onSave(name || placeholder, color!)}
                >Save</Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    onClick={() => closeModal(modalKey)}
                >Cancel</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

function AddToFolderModal({ modalProps, modalKey, bookmarks, onSave }: {
    modalProps: any,
    modalKey: string,
    bookmarks: Bookmarks,
    onSave: (folderIndex: number) => void;
}) {
    const [folderIndex, setIndex] = useState(-1);

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Text variant="heading-lg/semibold">Add Bookmark to Folder</Text>
            </ModalHeader>
            <ModalContent>
                <Forms.FormTitle className={Margins.top16}>Select a folder</Forms.FormTitle>
                <Select
                    options={[...Object.entries(bookmarks)
                        .filter(([, bookmark]) => isBookmarkFolder(bookmark))
                        .map(([index, bookmark]) => ({
                            label: bookmark.name,
                            value: parseInt(index, 10)
                        })),
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
        </ModalRoot>
    );
}

function DeleteFolderConfirmationModal({ modalProps, modalKey, onConfirm }) {
    return (
        <ModalRoot {...modalProps}>
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
                    Delete
                </Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    onClick={() => closeModal(modalKey)}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function BookmarkContextMenu({ bookmarks, index, methods }: { bookmarks: Bookmarks, index: number, methods: UseBookmarkMethods; }) {
    const { showBookmarkBar, bookmarkNotificationDot } = settings.use(["showBookmarkBar", "bookmarkNotificationDot"]);
    const bookmark = bookmarks[index];
    const isFolder = isBookmarkFolder(bookmark);

    return (
        <Menu.Menu
            navId="channeltabs-bookmark-context"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="ChannelTabs Bookmark Context Menu"
        >
            <Menu.MenuGroup>
                {bookmarkNotificationDot && !isFolder &&
                    <Menu.MenuItem
                        id="mark-as-read"
                        label={getIntlMessage("MARK_AS_READ")}
                        disabled={!ReadStateStore.hasUnread(bookmark.channelId)}
                        action={() => ReadStateUtils.ackChannel(ChannelStore.getChannel(bookmark.channelId))}
                    />
                }
                {isFolder
                    ? <Menu.MenuItem
                        id="open-all-in-folder"
                        label={"Open All Bookmarks"}
                        action={() => bookmark.bookmarks.forEach(b => createTab(b))}
                    />
                    : < Menu.MenuItem
                        id="open-in-tab"
                        label={"Open in New Tab"}
                        action={() => createTab(bookmark)}
                    />
                }
            </Menu.MenuGroup>
            <Menu.MenuGroup>
                <Menu.MenuItem
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
                    id="show-bookmark-bar"
                    label="Bookmark Bar"
                    action={() => {
                        settings.store.showBookmarkBar = !settings.store.showBookmarkBar;
                    }}
                />
            </Menu.MenuGroup>
        </Menu.Menu>
    );
}

export function TabContextMenu({ tab }: { tab: ChannelTabsProps; }) {
    const channel = ChannelStore.getChannel(tab.channelId);
    const [compact, setCompact] = useState(tab.compact);
    const { showBookmarkBar } = settings.use(["showBookmarkBar"]);

    return (
        <Menu.Menu
            navId="channeltabs-tab-context"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="ChannelTabs Tab Context Menu"
        >
            <Menu.MenuGroup>
                {channel &&
                    <Menu.MenuItem
                        id="mark-as-read"
                        label={getIntlMessage("MARK_AS_READ")}
                        disabled={!ReadStateStore.hasUnread(channel.id)}
                        action={() => ReadStateUtils.ackChannel(channel)}
                    />
                }
                <Menu.MenuCheckboxItem
                    checked={compact}
                    id="toggle-compact-tab"
                    label="Compact"
                    action={() => {
                        setCompact(compact => !compact);
                        toggleCompactTab(tab.id);
                    }}
                />
            </Menu.MenuGroup>
            {openedTabs.length !== 1 && <Menu.MenuGroup>
                <Menu.MenuItem
                    id="close-tab"
                    label="Close Tab"
                    action={() => closeTab(tab.id)}
                />
                <Menu.MenuItem
                    id="close-other-tabs"
                    label="Close Other Tabs"
                    action={() => closeOtherTabs(tab.id)}
                />
                <Menu.MenuItem
                    id="close-right-tabs"
                    label="Close Tabs to the Right"
                    disabled={openedTabs.indexOf(tab) === openedTabs.length - 1}
                    action={() => closeTabsToTheRight(tab.id)}
                />
                <Menu.MenuItem
                    id="close-left-tabs"
                    label="Close Tabs to the Left"
                    disabled={openedTabs.indexOf(tab) === 0}
                    action={() => closeTabsToTheLeft(tab.id)}
                />
                <Menu.MenuItem
                    id="reopen-closed-tab"
                    label="Reopen Closed Tab"
                    disabled={!hasClosedTabs()}
                    action={() => reopenClosedTab()}
                />
            </Menu.MenuGroup>}
            <Menu.MenuGroup>
                <Menu.MenuCheckboxItem
                    checked={showBookmarkBar}
                    id="show-bookmark-bar"
                    label="Bookmark Bar"
                    action={() => {
                        settings.store.showBookmarkBar = !settings.store.showBookmarkBar;
                    }}
                />
            </Menu.MenuGroup>
        </Menu.Menu>
    );
}
