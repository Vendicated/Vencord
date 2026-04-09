/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { copyToClipboard } from "@utils/clipboard";
import { Alerts, Button, ContextMenuApi, FluxDispatcher, Menu, showToast, Toasts } from "@webpack/common";

import { settings } from "../settings";
import { Gif, GifItem, GifPickerInstance } from "../types";
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
        <Menu.MenuItem label="Add To Collection" key="add-to-collection" id="add-to-collection">
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
                action={() => {
                    copyToClipboard(gif.url);
                    showToast("Image link copied to clipboard", Toasts.Type.SUCCESS);
                }}
            />
        );
    }

    group.push(AddToCollectionMenu(gif));
};

export function RemoveItemContextMenu({ type, nameOrId, instance }: { type: "collection" | "gif"; nameOrId: string; instance: { forceUpdate: () => void; }; }) {
    return (
        <Menu.Menu
            navId="gif-collection-id"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label={type === "collection" ? "Delete Collection" : "Remove"}
        >
            {type === "collection" && (
                <>
                    <Menu.MenuItem
                        key="collection-information"
                        id="collection-information"
                        label="Collection Information"
                        action={() => {
                            const collection = cache_collections.find(c => c.name === nameOrId);
                            if (collection) openCollectionInfoModal(collection);
                        }}
                    />
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        key="rename-collection"
                        id="rename-collection"
                        label="Rename"
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
                        action={() => {
                            const gif = getGifById(nameOrId);
                            if (gif) openGifInfoModal(gif);
                        }}
                    />
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        key="copy-url"
                        id="copy-url"
                        label="Copy URL"
                        action={() => {
                            const gif = getGifById(nameOrId);
                            if (!gif) return;
                            copyToClipboard(gif.url);
                            showToast("URL copied to clipboard", Toasts.Type.SUCCESS);
                        }}
                    />
                    <Menu.MenuItem
                        key="move-to-collection"
                        id="move-to-collection"
                        label="Move To Collection"
                        action={() => openMoveToCollectionModal(nameOrId)}
                    />
                    <Menu.MenuSeparator />
                </>
            )}
            <Menu.MenuItem
                key="delete-collection"
                id="delete-collection"
                label={type === "collection" ? "Delete Collection" : "Remove"}
                action={() => {
                    const doDelete = async () => {
                        if (type === "collection") {
                            deleteCollection(nameOrId);
                            instance.forceUpdate();
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
        </Menu.Menu>
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
                    action={() => {
                        copyToClipboard(gif.url);
                        showToast("Image link copied to clipboard", Toasts.Type.SUCCESS);
                    }}
                />
            )}
            {AddToCollectionMenu(gif)}
        </Menu.Menu>
    );
}

export function buildGifPickerContextMenu(e: React.MouseEvent, item: GifItem, GIF_COLLECTION_PREFIX: string, GIF_ITEM_PREFIX: string, instance: GifPickerInstance) {
    if (item?.name?.startsWith(GIF_COLLECTION_PREFIX)) {
        return ContextMenuApi.openContextMenu(e, () =>
            <RemoveItemContextMenu type="collection" nameOrId={item.name!} instance={instance} />
        );
    }
    if (item?.id?.startsWith(GIF_ITEM_PREFIX)) {
        return ContextMenuApi.openContextMenu(e, () =>
            <RemoveItemContextMenu type="gif" nameOrId={item.id!} instance={instance} />
        );
    }
    const { src, url, height, width } = item;
    if (src && url && height != null && width != null && !item.id?.startsWith(GIF_ITEM_PREFIX)) {
        return ContextMenuApi.openContextMenu(e, () =>
            <GifPickerContextMenu gif={{ id: uuidv4(GIF_ITEM_PREFIX), src, url, height, width }} />
        );
    }
    return null;
}
