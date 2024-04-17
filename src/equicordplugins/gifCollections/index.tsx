/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

// Plugin idea by brainfreeze (668137937333911553) 😎

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Alerts, Button, ContextMenuApi, FluxDispatcher, Forms, Menu, React, TextInput, useCallback, useState } from "@webpack/common";

import * as CollectionManager from "./CollectionManager";
import { GIF_COLLECTION_PREFIX, GIF_ITEM_PREFIX } from "./constants";
import { Category, Collection, Gif, Props } from "./types";
import { getFormat } from "./utils/getFormat";
import { getGif } from "./utils/getGif";
import { downloadCollections, uploadGifCollections } from "./utils/settingsUtils";
import { uuidv4 } from "./utils/uuidv4";

export const settings = definePluginSettings({
    defaultEmptyCollectionImage: {
        description: "The image / gif that will be shown when a collection has no images / gifs",
        type: OptionType.STRING,
        default: "https://i.imgur.com/TFatP8r.png"
    },
    importGifs: {
        type: OptionType.COMPONENT,
        description: "Import Collections",
        component: () =>
            <Button onClick={async () =>
                // if they have collections show the warning
                (await CollectionManager.getCollections()).length ? Alerts.show({
                    title: "Are you sure?",
                    body: "Importing collections will overwrite your current collections.",
                    confirmText: "Import",
                    // wow this works?
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
    }
});


const addCollectionContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;

    const { message, itemSrc, itemHref, target } = props;

    const gif = getGif(message, itemSrc ?? itemHref, target);

    if (!gif) return;

    const group = findGroupChildrenByChildId("open-native-link", children) ?? findGroupChildrenByChildId("copy-link", children);
    if (group && !group.some(child => child?.props?.id === "add-to-collection")) {
        group.push(
            // if i do it the normal way i get a invalid context menu thingy error -> Menu API only allows Items and groups of Items as children.
            MenuThingy({ gif })
        );
    }
};


export default definePlugin({
    name: "Gif Collection",
    // need better description eh
    description: "Allows you to have collections of gifs",
    authors: [Devs.Aria],
    contextMenus: {
        "message": addCollectionContextMenuPatch
    },
    patches: [
        {
            find: "renderCategoryExtras",
            replacement: [
                // This patch adds the collections to the gif part yk
                {
                    match: /(render\(\){)(.{1,50}getItemGrid)/,
                    replace: "$1;$self.insertCollections(this);$2"
                },
                // Hides the gc: from the name gc:monkeh -> monkeh
                // https://regex101.com/r/uEjLFq/1
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
                // Replaces this.props.resultItems with the collection.gifs
                {
                    match: /(renderContent\(\){)(.{1,50}resultItems)/,
                    replace: "$1$self.renderContent(this);$2"
                },
            ]
        },
        /*
        problem:
            when you click your collection in the gifs picker discord enters the collection name into the search bar
            which causes discord to fetch the gifs from their api. This causes a tiny flash when the gifs have fetched successfully
        solution:
            if query starts with gc: and collection is not null then return early and prevent the fetch
        */
        {
            find: "type:\"GIF_PICKER_QUERY\"",
            replacement: {
                match: /(function \i\(.{1,10}\){)(.{1,100}.GIFS_SEARCH,query:)/,
                replace:
                    "$1if($self.shouldStopFetch(arguments[0])) return;$2"
            }
        },
    ],

    settings,


    start() {
        CollectionManager.refreshCacheCollection();
    },

    CollectionManager,

    oldTrendingCat: null as Category[] | null,
    sillyInstance: null as any,
    sillyContentInstance: null as any,

    get collections(): Collection[] {
        CollectionManager.refreshCacheCollection();
        return CollectionManager.cache_collections;
    },

    renderContent(instance) {
        if (instance.props.query.startsWith(GIF_COLLECTION_PREFIX)) {
            this.sillyContentInstance = instance;
            const collection = this.collections.find(c => c.name === instance.props.query);
            if (!collection) return;
            instance.props.resultItems = collection.gifs.map(g => ({
                id: g.id,
                format: getFormat(g.src),
                src: g.src,
                url: g.url,
                width: g.width,
                height: g.height
            })).reverse();
        }

    },

    hidePrefix(name: string) {
        return name.split(":").length > 1 ? name.replace(/.+?:/, "") : name;
    },

    insertCollections(instance: { props: Props; }) {
        try {
            this.sillyInstance = instance;
            if (instance.props.trendingCategories.length && instance.props.trendingCategories[0].type === "Trending")
                this.oldTrendingCat = instance.props.trendingCategories;


            if (this.oldTrendingCat != null)
                instance.props.trendingCategories = this.collections.reverse().concat(this.oldTrendingCat as Collection[]);

        } catch (err) {
            console.error(err);
        }
    },

    shouldStopFetch(query: string) {
        if (query.startsWith(GIF_COLLECTION_PREFIX)) {
            const collection = this.collections.find(c => c.name === query);
            if (collection != null) return true;
        }
        return false;
    },

    collectionContextMenu(e: React.UIEvent, instance) {
        const { item } = instance.props;
        if (item?.name?.startsWith(GIF_COLLECTION_PREFIX))
            return ContextMenuApi.openContextMenu(e, () =>
                <RemoveItemContextMenu
                    type="collection"
                    onConfirm={() => { this.sillyInstance && this.sillyInstance.forceUpdate(); }}
                    nameOrId={instance.props.item.name} />
            );
        if (item?.id?.startsWith(GIF_ITEM_PREFIX)) {
            ContextMenuApi.openContextMenu(e, () =>
                <RemoveItemContextMenu
                    type="gif"
                    onConfirm={() => { this.sillyContentInstance && this.sillyContentInstance.forceUpdate(); }}
                    nameOrId={instance.props.item.id}
                />);
            instance.props.focused = false;
            instance.forceUpdate();
            this.sillyContentInstance && this.sillyContentInstance.forceUpdate();
            return;
        }

        const { src, url, height, width } = item;
        if (src && url && height != null && width != null && !item.id?.startsWith(GIF_ITEM_PREFIX))
            return ContextMenuApi.openContextMenu(e, () =>
                <Menu.Menu
                    navId="gif-collection-id"
                    onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                    aria-label="Gif Collections"
                >

                    {/* if i do it the normal way i get a invalid context menu thingy error -> Menu API only allows Items and groups of Items as children.*/}
                    {MenuThingy({ gif: { ...item, id: uuidv4() } })}


                </Menu.Menu>
            );
        return null;
    },
});



// stolen from spotify controls
const RemoveItemContextMenu = ({ type, nameOrId, onConfirm }: { type: "gif" | "collection", nameOrId: string, onConfirm: () => void; }) => (
    <Menu.Menu
        navId="gif-collection-id"
        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        aria-label={type === "collection" ? "Delete Collection" : "Remove"}
    >
        <Menu.MenuItem
            key="delete-collection"
            id="delete-collection"
            label={type === "collection" ? "Delete Collection" : "Remove"}
            action={() =>
                // Stolen from Review components
                type === "collection" ? Alerts.show({
                    title: "Are you sure?",
                    body: "Do you really want to delete this collection?",
                    confirmText: "Delete",
                    confirmColor: Button.Colors.RED,
                    cancelText: "Nevermind",
                    onConfirm: async () => {
                        await CollectionManager.deleteCollection(nameOrId);
                        onConfirm();
                    }
                }) : CollectionManager.removeFromCollection(nameOrId).then(() => onConfirm())}
        >

        </Menu.MenuItem>
    </Menu.Menu>
);



const MenuThingy: React.FC<{ gif: Gif; }> = ({ gif }) => {
    CollectionManager.refreshCacheCollection();
    const collections = CollectionManager.cache_collections;

    return (
        <Menu.MenuItem
            label="Add To Collection"
            key="add-to-collection"
            id="add-to-collection"
        >
            {collections.map(col => (
                <Menu.MenuItem
                    key={col.name}
                    id={col.name}
                    label={col.name.replace(/.+?:/, "")}
                    action={() => CollectionManager.addToCollection(col.name, gif)}
                />
            ))}

            <Menu.MenuSeparator />
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
};

interface CreateCollectionModalProps {
    gif: Gif;
    onClose: () => void,
    modalProps: ModalProps;
}

function CreateCollectionModal({ gif, onClose, modalProps }: CreateCollectionModalProps) {

    const [name, setName] = useState("");

    const onSubmit = useCallback((e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        if (!name.length) return;
        CollectionManager.createCollection(name, [gif]);
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
                    <TextInput onChange={(e: string) => setName(e)} />
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


