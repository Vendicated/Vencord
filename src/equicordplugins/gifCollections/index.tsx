/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { Devs, EquicordDevs } from "@utils/constants";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Alerts, Button, Clipboard, ContextMenuApi, FluxDispatcher, Forms, Menu, React, showToast, TextInput, Toasts, useCallback, useState } from "@webpack/common";

import { addToCollection, cache_collections, createCollection, DATA_COLLECTION_NAME, deleteCollection, fixPrefix, getCollections, getGifById, getItemCollectionNameFromId, moveGifToCollection, refreshCacheCollection, removeFromCollection, renameCollection } from "./utils/collectionManager";
import { getFormat } from "./utils/getFormat";
import { getGif } from "./utils/getGif";
import { downloadCollections, uploadGifCollections } from "./utils/settingsUtils";
import { uuidv4 } from "./utils/uuidv4";

let GIF_COLLECTION_PREFIX: string;
let GIF_ITEM_PREFIX: string;

export const SortingOptions = {
    NAME: 1,
    CREATION_DATE: 2,
    MODIFIED_DATE: 3
};

const addCollectionContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;
    const { message, itemSrc, itemHref, target } = props;
    const gif = getGif(message, itemSrc ?? itemHref, target);
    if (!gif) return;

    const group = findGroupChildrenByChildId("open-native-link", children) ?? findGroupChildrenByChildId("copy-link", children);
    if (group && !group.some(child => child?.props?.id === "add-to-collection")) {
        const collections = cache_collections;

        group.push(
            <Menu.MenuItem
                label="Add To Collection"
                key="add-to-collection"
                id="add-to-collection"
            >
                {collections.length > 0 && collections.map(col => (
                    <Menu.MenuItem
                        key={col.name}
                        id={col.name}
                        label={col.name.replace(/.+?:/, "")}
                        action={() => addToCollection(col.name, gif)}
                    />
                ))}

                {collections.length > 0 && <Menu.MenuSeparator key="separator" />}

                <Menu.MenuItem
                    key="create-collection"
                    id="create-collection"
                    label="Create Collection"
                    action={() => {
                        openModal(modalProps => (
                            <CreateCollectionModal onClose={modalProps.onClose} gif={gif} modalProps={modalProps} />
                        ));
                    }}
                />
            </Menu.MenuItem>
        );
    }
};


export const settings = definePluginSettings({
    itemPrefix: {
        description: "The prefix for gif items",
        type: OptionType.STRING,
        default: "gc-item:",
        onChange: value => {
            const normalizedValue = value.replace(/:+$/, "") + ":";
            if (normalizedValue === GIF_ITEM_PREFIX) return;
            GIF_ITEM_PREFIX = normalizedValue;
            settings.store.itemPrefix = normalizedValue;
            fixPrefix(normalizedValue);
        },
        restartNeeded: true
    },
    collectionPrefix: {
        description: "The prefix for collections",
        type: OptionType.STRING,
        default: "gc:",
        onChange: value => {
            const normalizedValue = value.replace(/:+$/, "") + ":";
            if (normalizedValue === GIF_COLLECTION_PREFIX) return;
            GIF_COLLECTION_PREFIX = normalizedValue;
            settings.store.collectionPrefix = normalizedValue;
            fixPrefix(normalizedValue);
        },
        restartNeeded: true
    },
    onlyShowCollections: {
        description: "Only show collections",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    stopWarnings: {
        description: "Stop deletion warnings",
        type: OptionType.BOOLEAN,
        default: false,
    },
    defaultEmptyCollectionImage: {
        description: "The image / gif that will be shown when a collection has no images / gifs",
        type: OptionType.STRING,
        default: "https://c.tenor.com/YEG33HsLEaIAAAAC/parksandrec-oops.gif"
    },
    collectionsSortType: {
        description: "The type of sorting for collections",
        type: OptionType.NUMBER,
        default: SortingOptions.NAME,
        hidden: true
    },
    collectionsSortOrder: {
        description: "The order of sorting for collections",
        type: OptionType.STRING,
        default: "asc",
        hidden: true
    },
    collectionsSort: {
        type: OptionType.COMPONENT,
        description: "Decide how to sort collections",
        component: () => {
            const [sortType, setSortType] = useState(settings.store.collectionsSortType || SortingOptions.NAME);
            const [sortOrder, setSortOrder] = useState(settings.store.collectionsSortOrder || "asc");

            const handleSortTypeChange = value => {
                setSortType(value);
                settings.store.collectionsSortType = value;
            };

            const handleSortOrderChange = value => {
                setSortOrder(value);
                settings.store.collectionsSortOrder = value;
            };

            return (
                <div className="collections-sort-container">
                    <Forms.FormTitle className="collections-sort-title">Sort Collections</Forms.FormTitle>
                    <Forms.FormDivider className="collections-sort-divider" />
                    <Forms.FormText className="collections-sort-description">
                        Choose a sorting criteria for your collections
                    </Forms.FormText>
                    <Forms.FormDivider className="collections-sort-divider" />
                    <div className="collections-sort-section">
                        <Forms.FormText className="collections-sort-section-title">Sort By</Forms.FormText>
                        <div className="collections-sort-option">
                            <label className="collections-sort-label">
                                <input
                                    type="radio"
                                    name="sortType"
                                    value={SortingOptions.NAME}
                                    checked={sortType === SortingOptions.NAME}
                                    onChange={() => handleSortTypeChange(SortingOptions.NAME)}
                                    className="collections-sort-input"
                                />
                                Name
                            </label>
                        </div>
                        <div className="collections-sort-option">
                            <label className="collections-sort-label">
                                <input
                                    type="radio"
                                    name="sortType"
                                    value={SortingOptions.CREATION_DATE}
                                    checked={sortType === SortingOptions.CREATION_DATE}
                                    onChange={() => handleSortTypeChange(SortingOptions.CREATION_DATE)}
                                    className="collections-sort-input"
                                />
                                Creation Date
                            </label>
                        </div>
                        <div className="collections-sort-option">
                            <label className="collections-sort-label">
                                <input
                                    type="radio"
                                    name="sortType"
                                    value={SortingOptions.MODIFIED_DATE}
                                    checked={sortType === SortingOptions.MODIFIED_DATE}
                                    onChange={() => handleSortTypeChange(SortingOptions.MODIFIED_DATE)}
                                    className="collections-sort-input"
                                />
                                Modified Date
                            </label>
                        </div>
                    </div>
                    <Forms.FormDivider className="collections-sort-divider" />
                    <div className="collections-sort-section">
                        <Forms.FormText className="collections-sort-section-title">Order</Forms.FormText>
                        <div className="collections-sort-option">
                            <label className="collections-sort-label">
                                <input
                                    type="radio"
                                    name="sortOrder"
                                    value="asc"
                                    checked={sortOrder === "asc"}
                                    onChange={() => handleSortOrderChange("asc")}
                                    className="collections-sort-input"
                                />
                                Ascending
                            </label>
                        </div>
                        <div className="collections-sort-option">
                            <label className="collections-sort-label">
                                <input
                                    type="radio"
                                    name="sortOrder"
                                    value="desc"
                                    checked={sortOrder === "desc"}
                                    onChange={() => handleSortOrderChange("desc")}
                                    className="collections-sort-input"
                                />
                                Descending
                            </label>
                        </div>
                    </div>
                </div>
            );
        }
    },
    importGifs: {
        type: OptionType.COMPONENT,
        description: "Import Collections",
        component: () =>
            <Button onClick={async () =>
                (await getCollections()).length ? Alerts.show({
                    title: "Are you sure?",
                    body: "Importing collections will overwrite your current collections.",
                    confirmText: "Import",
                    confirmColor: Button.Colors.RED,
                    cancelText: "Nevermind",
                    onConfirm: async () => uploadGifCollections()
                }) : uploadGifCollections()}>
                Import Collections
            </Button>,
    },
    exportGifs: {
        type: OptionType.COMPONENT,
        description: "Export Collections",
        component: () =>
            <Button onClick={downloadCollections}>
                Export Collections
            </Button>
    },
    resetCollections: {
        type: OptionType.COMPONENT,
        description: "Reset Collections",
        component: () =>
            <Button onClick={() =>
                Alerts.show({
                    title: "Are you sure?",
                    body: "Resetting collections will remove all your collections.",
                    confirmText: "Reset",
                    confirmColor: Button.Colors.RED,
                    cancelText: "Nevermind",
                    onConfirm: async () => {
                        await DataStore.set(DATA_COLLECTION_NAME, []);
                        refreshCacheCollection();
                    }
                })}>
                Reset Collections
            </Button>
    }
});

export default definePlugin({
    name: "GifCollections",
    description: "Allows you to create collections of gifs",
    authors: [Devs.Aria, EquicordDevs.creations],
    patches: [
        {
            find: "renderCategoryExtras",
            replacement: [
                {
                    match: /(render\(\){)(.{1,50}getItemGrid)/,
                    replace: "$1;$self.insertCollections(this);$2"
                },
                {
                    match: /(className:\w\.categoryName,children:)(\i)/,
                    replace: "$1$self.hidePrefix($2),"
                },
            ]
        },
        {
            find: "renderEmptyFavorite",
            replacement: {
                match: /render\(\){.{1,500}onClick:this\.handleClick,/,
                replace: "$&onContextMenu: (e) => $self.collectionContextMenu(e, this),"
            }
        },
        {
            find: "renderHeaderContent()",
            replacement: [
                {
                    match: /(renderContent\(\){)(.{1,50}resultItems)/,
                    replace: "$1$self.renderContent(this);$2"
                },
            ]
        },
        {
            find: "type:\"GIF_PICKER_QUERY\"",
            replacement: {
                match: /(function \i\(.{1,10}\){)(.{1,100}.GIFS_SEARCH,query:)/,
                replace: "$1if($self.shouldStopFetch(arguments[0])) return;$2"
            }
        },
    ],
    settings,
    contextMenus: {
        "message": addCollectionContextMenuPatch
    },
    start() {
        refreshCacheCollection();
        GIF_COLLECTION_PREFIX = settings.store.collectionPrefix;
        GIF_ITEM_PREFIX = settings.store.itemPrefix;
    },
    get collections() {
        refreshCacheCollection();
        return this.sortedCollections();
    },
    sortedCollections() {
        return cache_collections.sort((a, b) => {
            const sortType = settings.store.collectionsSortType;
            const sortOrder = settings.store.collectionsSortOrder === "asc" ? 1 : -1;
            switch (sortType) {
                case SortingOptions.NAME:
                    return a.name.localeCompare(b.name) * sortOrder;
                case SortingOptions.CREATION_DATE:
                    return ((a.createdAt ?? 0) - (b.createdAt ?? 0)) * sortOrder;
                case SortingOptions.MODIFIED_DATE:
                    return ((a.lastUpdated ?? 0) - (b.lastUpdated ?? 0)) * sortOrder;
                default:
                    return 0;
            }
        });
    },
    renderContent(instance) {
        if (instance.props.query.startsWith(GIF_COLLECTION_PREFIX)) {
            const collection = this.collections.find(c => c.name === instance.props.query);
            if (collection) {
                instance.props.resultItems = collection.gifs.map(g => ({
                    id: g.id,
                    format: getFormat(g.src),
                    src: g.src,
                    url: g.url,
                    width: g.width,
                    height: g.height
                })).reverse();
            }
        }
    },
    hidePrefix(name) {
        return name.split(":".length > 1) ? name.replace(/.+?:/, "") : name;
    },
    insertCollections(instance) {
        const shouldRemoveAll = settings.store.onlyShowCollections;
        try {
            if (instance.props.trendingCategories.length && instance.props.trendingCategories[0].type === "Trending") {
                this.oldTrendingCat = instance.props.trendingCategories;
            }
            if (shouldRemoveAll) {
                instance.props.trendingCategories = this.sortedCollections().concat(instance.props.favorites);
            } else if (this.oldTrendingCat != null) {
                instance.props.trendingCategories = this.sortedCollections().concat(this.oldTrendingCat);
            }
        } catch (err) {
            console.error(err);
        }
    },
    shouldStopFetch(query) {
        return query.startsWith(GIF_COLLECTION_PREFIX) && this.collections.find(c => c.name === query) != null;
    },
    collectionContextMenu(e, instance) {
        const { item } = instance.props;
        if (item?.name?.startsWith(GIF_COLLECTION_PREFIX)) {
            return ContextMenuApi.openContextMenu(e, () =>
                <RemoveItemContextMenu type="collection" nameOrId={item.name} instance={instance} />
            );
        }
        if (item?.id?.startsWith(GIF_ITEM_PREFIX)) {
            return ContextMenuApi.openContextMenu(e, () =>
                <RemoveItemContextMenu type="gif" nameOrId={item.id} instance={instance} />
            );
        }
        const { src, url, height, width } = item;
        if (src && url && height != null && width != null && !item.id?.startsWith(GIF_ITEM_PREFIX)) {
            return ContextMenuApi.openContextMenu(e, () =>
                <Menu.Menu
                    navId="gif-collection-id"
                    onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                    aria-label="Gif Collections"
                >
                    {MenuThingy({ gif: { ...item, id: uuidv4(GIF_ITEM_PREFIX) } })}
                </Menu.Menu>
            );
        }
        return null;
    },
});

const RemoveItemContextMenu = ({ type, nameOrId, instance }) => (
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
                        if (!collection) return;
                        openModal(modalProps => (
                            <ModalRoot
                                {...modalProps}
                                size={ModalSize.SMALL}
                                transitionState={modalProps.transitionState}
                                className="custom-modal"
                            >
                                <ModalHeader separator={false} className="custom-modal-header">
                                    <Forms.FormText className="custom-modal-title">Collection Information</Forms.FormText>
                                </ModalHeader>
                                <ModalContent className="custom-modal-content">
                                    <Forms.FormSection>
                                        <Flex className="collection-info">
                                            <Forms.FormTitle tag="h5" className="collection-info-title">Name</Forms.FormTitle>
                                            <Forms.FormText className="collection-info-text">{collection.name.replace(/.+?:/, "")}</Forms.FormText>
                                        </Flex>
                                        <Flex className="collection-info">
                                            <Forms.FormTitle tag="h5" className="collection-info-title">Gifs</Forms.FormTitle>
                                            <Forms.FormText className="collection-info-text">{collection.gifs.length}</Forms.FormText>
                                        </Flex>
                                        <Flex className="collection-info">
                                            <Forms.FormTitle tag="h5" className="collection-info-title">Created At</Forms.FormTitle>
                                            <Forms.FormText className="collection-info-text">{collection.createdAt ? new Date(collection.createdAt).toLocaleString() : "Unknown"}</Forms.FormText>
                                        </Flex>
                                        <Flex className="collection-info">
                                            <Forms.FormTitle tag="h5" className="collection-info-title">Last Updated</Forms.FormTitle>
                                            <Forms.FormText className="collection-info-text">{collection.lastUpdated ? new Date(collection.lastUpdated).toLocaleString() : "Unknown"}</Forms.FormText>
                                        </Flex>
                                    </Forms.FormSection>
                                </ModalContent>
                                <ModalFooter className="custom-modal-footer">
                                    <Button onClick={modalProps.onClose} className="custom-modal-button">Close</Button>
                                </ModalFooter>
                            </ModalRoot>
                        ));
                    }}
                />
                <Menu.MenuSeparator />
                <Menu.MenuItem
                    key="rename-collection"
                    id="rename-collection"
                    label="Rename"
                    action={() => openModal(modalProps => (
                        <RenameCollectionModal
                            onClose={modalProps.onClose}
                            name={nameOrId}
                            modalProps={modalProps}
                        />
                    ))}
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
                        const gifInfo = getGifById(nameOrId);
                        if (!gifInfo) return;
                        openModal(modalProps => (
                            <ModalRoot
                                {...modalProps}
                                size={ModalSize.SMALL}
                                transitionState={modalProps.transitionState}
                                className="custom-modal"
                            >
                                <ModalHeader separator={false} className="custom-modal-header">
                                    <Forms.FormText className="custom-modal-title">Information</Forms.FormText>
                                </ModalHeader>
                                <ModalContent className="custom-modal-content">
                                    <Forms.FormSection>
                                        <Flex className="gif-info">
                                            <Forms.FormTitle tag="h5" className="gif-info-title">Added At</Forms.FormTitle>
                                            <Forms.FormText className="gif-info-text">{gifInfo.addedAt ? new Date(gifInfo.addedAt).toLocaleString() : "Unknown"}</Forms.FormText>
                                        </Flex>
                                        <Flex className="gif-info">
                                            <Forms.FormTitle tag="h5" className="gif-info-title">Width</Forms.FormTitle>
                                            <Forms.FormText className="gif-info-text">{gifInfo.width}</Forms.FormText>
                                        </Flex>
                                        <Flex className="gif-info">
                                            <Forms.FormTitle tag="h5" className="gif-info-title">Height</Forms.FormTitle>
                                            <Forms.FormText className="gif-info-text">{gifInfo.height}</Forms.FormText>
                                        </Flex>
                                    </Forms.FormSection>
                                </ModalContent>
                                <ModalFooter className="custom-modal-footer">
                                    <Button onClick={modalProps.onClose} className="custom-modal-button">Close</Button>
                                </ModalFooter>
                            </ModalRoot>
                        ));
                    }}
                />
                <Menu.MenuSeparator />
                <Menu.MenuItem
                    key="copy-url"
                    id="copy-url"
                    label="Copy URL"
                    action={() => {
                        const gifInfo = getGifById(nameOrId);
                        if (!gifInfo) return;
                        Clipboard.copy(gifInfo.url);
                        showToast("URL copied to clipboard", Toasts.Type.SUCCESS);
                    }}
                />
                <Menu.MenuItem
                    key="move-to-collection"
                    id="move-to-collection"
                    label="Move To Collection"
                    action={() => {
                        openModal(modalProps => (
                            <ModalRoot
                                {...modalProps}
                                size={ModalSize.SMALL}
                                transitionState={modalProps.transitionState}
                                className="custom-modal"
                            >
                                <ModalHeader separator={false} className="custom-modal-header">
                                    <Forms.FormText className="custom-modal-title">Move To Collection</Forms.FormText>
                                </ModalHeader>
                                <ModalContent className="custom-modal-content">
                                    <Forms.FormTitle tag="h5" className="custom-modal-text">
                                        Select a collection to move the item to
                                    </Forms.FormTitle>
                                    <div className="collection-buttons">
                                        {cache_collections
                                            .filter(col => col.name !== getItemCollectionNameFromId(nameOrId))
                                            .map(col => (
                                                <Button
                                                    key={col.name}
                                                    id={col.name}
                                                    onClick={async () => {
                                                        const fromCollection = getItemCollectionNameFromId(nameOrId);
                                                        if (!fromCollection) return;
                                                        await moveGifToCollection(nameOrId, fromCollection, col.name);
                                                        FluxDispatcher.dispatch({
                                                            type: "GIF_PICKER_QUERY",
                                                            query: `${fromCollection} `
                                                        });
                                                        FluxDispatcher.dispatch({
                                                            type: "GIF_PICKER_QUERY",
                                                            query: `${fromCollection}`
                                                        });
                                                        modalProps.onClose();
                                                    }}
                                                    className="collection-button"
                                                >
                                                    {col.name.replace(/.+?:/, "")}
                                                </Button>
                                            ))}
                                    </div>
                                </ModalContent>
                                <ModalFooter className="custom-modal-footer">
                                    <Button onClick={modalProps.onClose} className="custom-modal-button">Close</Button>
                                </ModalFooter>
                            </ModalRoot>
                        ));
                    }}
                />
                <Menu.MenuSeparator />
            </>
        )}
        <Menu.MenuItem
            key="delete-collection"
            id="delete-collection"
            label={type === "collection" ? "Delete Collection" : "Remove"}
            action={async () => {
                if (settings.store.stopWarnings) {
                    const collectionName = getItemCollectionNameFromId(nameOrId);
                    if (type === "collection") {
                        deleteCollection(nameOrId);
                        instance.forceUpdate();
                    } else {
                        await removeFromCollection(nameOrId);
                        FluxDispatcher.dispatch({
                            type: "GIF_PICKER_QUERY",
                            query: `${collectionName} `
                        });
                        FluxDispatcher.dispatch({
                            type: "GIF_PICKER_QUERY",
                            query: `${collectionName}`
                        });
                    }
                    return;
                }
                Alerts.show({
                    title: "Are you sure?",
                    body: `Do you really want to ${type === "collection" ? "delete this collection" : "remove this item"}?`,
                    confirmText: type === "collection" ? "Delete" : "Remove",
                    confirmColor: Button.Colors.RED,
                    cancelText: "Nevermind",
                    onConfirm: async () => {
                        const collectionName = type === "collection" ? nameOrId : getItemCollectionNameFromId(nameOrId);
                        if (type === "collection") {
                            deleteCollection(nameOrId);
                            instance.forceUpdate();
                        } else {
                            await removeFromCollection(nameOrId);
                            FluxDispatcher.dispatch({
                                type: "GIF_PICKER_QUERY",
                                query: `${collectionName} `
                            });
                            FluxDispatcher.dispatch({
                                type: "GIF_PICKER_QUERY",
                                query: `${collectionName}`
                            });
                        }
                    }
                });
            }}
        />
    </Menu.Menu>
);

const MenuThingy = ({ gif }) => {
    const collections = cache_collections;
    return (
        <Menu.MenuItem label="Add To Collection" key="add-to-collection" id="add-to-collection">
            {collections.map(col => (
                <Menu.MenuItem
                    key={col.name}
                    id={col.name}
                    label={col.name.replace(/.+?:/, "")}
                    action={() => addToCollection(col.name, gif)}
                />
            ))}
            {collections.length > 0 && <Menu.MenuSeparator />}
            <Menu.MenuItem
                key="create-collection"
                id="create-collection"
                label="Create Collection"
                action={() => openModal(modalProps => (
                    <CreateCollectionModal onClose={modalProps.onClose} gif={gif} modalProps={modalProps} />
                ))}
            />
        </Menu.MenuItem>
    );
};

function CreateCollectionModal({ gif, onClose, modalProps }) {
    const [name, setName] = useState("");
    const onSubmit = useCallback(e => {
        e.preventDefault();
        if (!name.length) return;
        createCollection(name, [gif]);
        onClose();
    }, [name]);

    return (
        <ModalRoot {...modalProps}>
            <form onSubmit={onSubmit}>
                <ModalHeader>
                    <Forms.FormText>Create Collection</Forms.FormText>
                </ModalHeader>
                <ModalContent>
                    <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Collection Name</Forms.FormTitle>
                    <TextInput onChange={e => setName(e)} />
                </ModalContent>
                <div style={{ marginTop: "1rem" }}>
                    <ModalFooter>
                        <Button
                            type="submit"
                            color={Button.Colors.GREEN}
                            disabled={!name.length}
                            onClick={onSubmit}
                        >
                            Create
                        </Button>
                    </ModalFooter>
                </div>
            </form>
        </ModalRoot>
    );
}

function RenameCollectionModal({ name, onClose, modalProps }) {
    const prefix = settings.store.collectionPrefix;
    const strippedName = name.startsWith(prefix) ? name.slice(prefix.length) : name;
    const [newName, setNewName] = useState(strippedName);

    const onSubmit = useCallback(async e => {
        e.preventDefault();
        if (!newName.length || newName.length >= 25) return;
        await renameCollection(name, newName);
        onClose();
    }, [newName, name, onClose]);

    return (
        <ModalRoot {...modalProps}>
            <form onSubmit={onSubmit}>
                <ModalHeader>
                    <Forms.FormText>Rename Collection</Forms.FormText>
                </ModalHeader>
                <ModalContent>
                    <Forms.FormText className="rename-collection-text">New Collection Name</Forms.FormText>
                    <TextInput value={newName} className={`rename-collection-input ${newName.length >= 25 ? "input-warning" : ""}`} onChange={e => setNewName(e)} />
                    {newName.length >= 25 && <Forms.FormText className="warning-text">Name can't be longer than 24 characters</Forms.FormText>}
                </ModalContent>
                <div style={{ marginTop: "1rem" }}>
                    <ModalFooter>
                        <Button
                            type="submit"
                            color={Button.Colors.GREEN}
                            disabled={!newName.length || newName.length >= 25}
                            onClick={onSubmit}
                        >
                            Rename
                        </Button>
                    </ModalFooter>
                </div>
            </form>
        </ModalRoot>
    );
}
