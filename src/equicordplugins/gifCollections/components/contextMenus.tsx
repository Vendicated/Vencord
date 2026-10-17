/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { FolderIcon, InfoIcon, LinkIcon, PencilIcon, PlusIcon, RemixIcon, TrashIcon } from "@components/Icons";
import { copyToClipboard } from "@utils/clipboard";
import { Alerts, Button, FluxDispatcher, Menu, showToast } from "@webpack/common";

import { settings } from "../settings";
import { Gif } from "../types";
import { addToCollection, cache_collections, deleteCollection, getGifById, getItemCollectionNameFromId, removeFromCollection } from "../utils/collectionManager";
import { getGif } from "../utils/getGif";
import { stripPrefix } from "../utils/misc";
import { uuidv4 } from "../utils/uuidv4";
import { openCollectionInfoModal, openCreateCollectionModal, openGifInfoModal, openMoveToCollectionModal, openRenameCollectionModal } from "./modals";

function dispatchRefresh(collectionName: string) {
    FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY", query: "" });
    FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY", query: collectionName });
}

function AddToCollectionMenu(gif: Gif) {
    return (
        <Menu.MenuItem
            label="Add To Collection"
            key="add-to-collection"
            id="add-to-collection"
            icon={FolderIcon}
            leadingAccessory={{ type: "icon", icon: FolderIcon }}
        >
            {cache_collections.length > 0 && cache_collections.map(col => (
                <Menu.MenuItem
                    key={col.name}
                    id={col.name}
                    label={stripPrefix(col.name)}
                    action={() => addToCollection(col.name, gif)}
                />
            ))}
            {cache_collections.length > 0 && <Menu.MenuSeparator key="separator" />}
            <Menu.MenuItem
                key="create-collection"
                id="create-collection"
                label="Create Collection"
                icon={PlusIcon}
                leadingAccessory={{ type: "icon", icon: PlusIcon }}
                action={() => openCreateCollectionModal(gif)}
            />
        </Menu.MenuItem>
    );
}

export const addCollectionContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;
    const { message, itemSrc, itemHref, target } = props;
    const gif = getGif(message, itemSrc ?? itemHref, target);
    if (!gif) return;

    const group = findGroupChildrenByChildId("open-native-link", children) ?? findGroupChildrenByChildId("copy-link", children);
    if (!group || group.some(child => child?.props?.id === "add-to-collection")) return;

    if (settings.store.showCopyImageLink) {
        group.push(
            <Menu.MenuItem
                label="Copy Image Link"
                key="copy-image-link"
                id="copy-image-link"
                icon={LinkIcon}
                leadingAccessory={{ type: "icon", icon: LinkIcon }}
                action={() => {
                    copyToClipboard(gif.url);
                    showToast({ text: "Image link copied to clipboard", variant: "success" });
                }}
            />
        );
    }

    group.push(AddToCollectionMenu(gif));
};

export function RemoveItemContextMenuItems({ type, nameOrId }: { type: "collection" | "gif"; nameOrId: string; }) {
    return (
        <Menu.MenuGroup key={`remove-item-${nameOrId}`}>
            {type === "collection" && (
                <>
                    <Menu.MenuItem
                        key="collection-information"
                        id="collection-information"
                        label="Collection Information"
                        icon={InfoIcon}
                        leadingAccessory={{ type: "icon", icon: InfoIcon }}
                        action={() => {
                            const collection = cache_collections.find(c => c.name === nameOrId);
                            if (collection) openCollectionInfoModal(collection);
                        }}
                    />
                    <Menu.MenuSeparator key="collection-sep-1" />
                    <Menu.MenuItem
                        key="rename-collection"
                        id="rename-collection"
                        label="Rename"
                        icon={PencilIcon}
                        leadingAccessory={{ type: "icon", icon: PencilIcon }}
                        action={() => openRenameCollectionModal(nameOrId)}
                    />
                </>
            )}
            {type === "gif" && (
                <>
                    <Menu.MenuItem
                        key="gif-information"
                        id="gif-information"
                        label="Information"
                        icon={InfoIcon}
                        leadingAccessory={{ type: "icon", icon: InfoIcon }}
                        action={() => {
                            const gif = getGifById(nameOrId);
                            if (gif) openGifInfoModal(gif);
                        }}
                    />
                    <Menu.MenuSeparator key="gif-sep-1" />
                    <Menu.MenuItem
                        key="copy-url"
                        id="copy-url"
                        label="Copy URL"
                        icon={LinkIcon}
                        leadingAccessory={{ type: "icon", icon: LinkIcon }}
                        action={() => {
                            const gif = getGifById(nameOrId);
                            if (!gif) return;
                            copyToClipboard(gif.url);
                            showToast({ text: "URL copied to clipboard", variant: "success" });
                        }}
                    />
                    <Menu.MenuItem
                        key="move-to-collection"
                        id="move-to-collection"
                        label="Move To Collection"
                        icon={RemixIcon}
                        leadingAccessory={{ type: "icon", icon: RemixIcon }}
                        action={() => openMoveToCollectionModal(nameOrId)}
                    />
                    <Menu.MenuSeparator key="gif-sep-2" />
                </>
            )}
            <Menu.MenuItem
                key="delete-collection"
                id="delete-collection"
                label={type === "collection" ? "Delete Collection" : "Remove"}
                icon={TrashIcon}
                leadingAccessory={{ type: "icon", icon: TrashIcon }}
                action={() => {
                    const doDelete = async () => {
                        if (type === "collection") {
                            deleteCollection(nameOrId);
                            FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY", query: "" });
                        } else {
                            const collectionName = getItemCollectionNameFromId(nameOrId);
                            await removeFromCollection(nameOrId);
                            if (collectionName) dispatchRefresh(collectionName);
                        }
                    };

                    if (settings.store.stopWarnings) {
                        doDelete();
                        return;
                    }

                    Alerts.show({
                        title: "Are you sure?",
                        body: `Do you really want to ${type === "collection" ? "delete this collection" : "remove this item"}?`,
                        confirmText: type === "collection" ? "Delete" : "Remove",
                        confirmColor: Button.Colors.RED,
                        cancelText: "Nevermind",
                        onConfirm: doDelete,
                    });
                }}
            />
        </Menu.MenuGroup>
    );
}

export function GifPickerContextMenu({ gif }: { gif: Gif; }) {
    return (
        <Menu.Menu
            navId="gif-collection-id"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Gif Collections"
        >
            {settings.store.showCopyImageLink && (
                <Menu.MenuItem
                    label="Copy Image Link"
                    key="copy-image-link"
                    id="copy-image-link"
                    icon={LinkIcon}
                    leadingAccessory={{ type: "icon", icon: LinkIcon }}
                    action={() => {
                        copyToClipboard(gif.url);
                        showToast({ text: "Image link copied to clipboard", variant: "success" });
                    }}
                />
            )}
            {AddToCollectionMenu(gif)}
        </Menu.Menu>
    );
}

export function getGifPickerContextMenuItems(src: string, url: string, height: number, width: number) {
    const gif: Gif = { id: uuidv4(settings.store.itemPrefix), src, url, height, width };
    return (
        <Menu.MenuGroup key="gif-collections-group">
            {settings.store.showCopyImageLink && (
                <Menu.MenuItem
                    label="Copy Image Link"
                    key="copy-image-link"
                    id="copy-image-link"
                    icon={LinkIcon}
                    leadingAccessory={{ type: "icon", icon: LinkIcon }}
                    action={() => {
                        copyToClipboard(url);
                        showToast({ text: "Image link copied to clipboard", variant: "success" });
                    }}
                />
            )}
            {AddToCollectionMenu(gif)}
        </Menu.MenuGroup>
    );
}
