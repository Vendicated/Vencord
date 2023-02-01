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

import { Devs } from "@utils/constants";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Alerts, Button, ContextMenu, FluxDispatcher, Forms, Menu, React, TextInput } from "@webpack/common";

import * as CollectionManager from "./CollectionManager";
import { Category, Collection, Gif, Props } from "./types";
import { getFormat } from "./utils/getFormat";
import { uuidv4 } from "./utils/uuidv4";

export default definePlugin({
    name: "Gif Collection",
    // need better description eh
    description: "Allows you to have collections of gifs",
    authors: [Devs.Aria],
    patches: [
        {
            find: "renderCategoryExtras",
            replacement: [
                // This patch adds the collections to the gif part yk
                {
                    match: /(.{1,2}\.render=function\(\){)(.{1,50}getItemGrid)/,
                    replace: "$1;Vencord.Plugins.plugins[\"Gif Collection\"].insertCollections(this);$2"
                },
                // Hides the gc: from the name gc:monkeh -> monkeh
                {
                    match: /(.{1,2}\.renderCategoryExtras=function\((.)\){)var (.{1,2})=.{1,2}\.name,/,
                    replace: (_, first, props, varName) => `${first}var ${varName}=Vencord.Plugins.plugins["Gif Collection"].hidePrefix(${props}),`
                },
                // Replaces this.props.resultItems with the collection.gifs
                {
                    // ill improve the regex later
                    match: /(.{1,2}\.renderContent=function\(\){)/,
                    replace: "$1;Vencord.Plugins.plugins[\"Gif Collection\"].renderContent(this);"
                },
                // Delete context menu for collection
                {
                    match: /(.{1,2}\.render=function\(\){.{1,100}renderExtras.{1,200}onClick:this\.handleClick,)/,
                    replace: "$1onContextMenu: (e) => Vencord.Plugins.plugins[\"Gif Collection\"].collectionContextMenu(e, this),"
                }
            ]
        },
        // Ven goated ong on me
        {
            find: "open-native-link",
            replacement: {
                match: /id:"open-native-link".{0,200}\(\{href:(.{0,3}),.{0,200}\},"open-native-link"\)/,
                replace: (m, src) =>
                    `${m},Vencord.Plugins.plugins['Gif Collection'].makeMenu(${src}, arguments[2])`
            }
        },
        {
            // pass the target to the open link menu so we can grab its data
            find: "REMOVE_ALL_REACTIONS_CONFIRM_BODY,",
            replacement: [
                // pass target to st function -> st({target: d, /* ... */})
                {
                    match: /((?<target>.)=.{1,2}\.target,.{1,500}return .{1,3}{)/,
                    replace: "$1target:$<target>,"
                },
                // pass target from e.target and send it to open link component
                {
                    // im sorry
                    match: /(=(?<props>.{1,2})\.itemSrc.{1,2700}return .{1,100},.{1,2}=\(.{1,10}\)\()(?<args>null.{1,10})\)/,
                    replace: "$1$<args>,$<props>.target)"
                }
            ]
        }
    ],

    start() {
        CollectionManager.refreshCacheCollection();
    },

    oldTrendingCat: null as Category[] | null,
    sillyInstance: null as any,
    sillyContentInstance: null as any,

    get collections(): Collection[] {
        CollectionManager.refreshCacheCollection();
        return CollectionManager.cache_collections;
    },


    renderContent(instance) {
        if (instance.props.query.startsWith("gc:")) {
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

    hidePrefix(props: Category) {
        const res = props.name.split(":");
        return res.length > 1 ? res[1] : res[0];
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

    collectionContextMenu(e, instance) {
        if (instance.props.item.name != null && instance.props.item.name.startsWith("gc:"))
            return ContextMenu.open(e, () =>
                <RemoveItemContextMenu
                    type="collection"
                    onConfirm={() => { this.sillyInstance && this.sillyInstance.forceUpdate(); }}
                    nameOrId={instance.props.item.name} />
            );
        if (instance.props.item.id.startsWith("gc-moment:"))
            return ContextMenu.open(e, () =>
                <RemoveItemContextMenu
                    type="gif"
                    onConfirm={() => { this.sillyContentInstance && this.sillyContentInstance.forceUpdate(); }}
                    nameOrId={instance.props.item.id}
                />);

        return null;
    },



    makeMenu(url: string, target: HTMLElement) {
        if (target == null || target && !(target instanceof HTMLImageElement) && target.attributes["data-role"]?.value !== "img")
            return null;

        // oh my
        const src = (target.nextElementSibling?.firstElementChild as HTMLVideoElement)?.src ?? url;

        const height = (target.nextElementSibling?.firstElementChild as HTMLVideoElement)?.height ?? target.clientHeight;
        const width = (target.nextElementSibling?.firstElementChild as HTMLVideoElement)?.width ?? target.clientWidth;

        const gif: Gif = {
            id: uuidv4(),
            height,
            width,
            src,
            url
        };

        return (
            <Menu.MenuItem
                label="Add To Collection"
                key="add-to-collection"
                id="add-to-collection"
            >
                {this.collections.length ? this.collections.map(col => {
                    const key = "add-to-collection-" + col.name;
                    return (
                        <Menu.MenuItem
                            key={key}
                            id={key}
                            label={col.name.split(":")[1]}
                            action={() => CollectionManager.addToCollection(col.name, gif)}
                        />
                    );
                }) : /* bruh */ <></>}

                <Menu.MenuSeparator />
                <Menu.MenuItem
                    key="create-collection"
                    id="create-collectiohn1"
                    label="Create Collection"
                    action={() => {
                        openModal(modalProps => (
                            <ModalRoot {...modalProps}>
                                <ModalHeader>
                                    <Forms.FormText>Create Collection</Forms.FormText>
                                </ModalHeader>
                                <CreateCollectionModal onClose={modalProps.onClose} createCollection={CollectionManager.createCollection} gif={gif} />
                            </ModalRoot>
                        ));
                    }}
                />
            </Menu.MenuItem>
        );
    }
});

// stolen from spotify controls
const RemoveItemContextMenu = ({ type, nameOrId, onConfirm }: { type: "gif" | "collection", nameOrId: string, onConfirm: () => void; }) => (
    <Menu.ContextMenu
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
                    cancelText: "Nevermind",
                    onConfirm: async () => {
                        await CollectionManager.deleteCollection(nameOrId);
                        onConfirm();
                    }
                }) : CollectionManager.removeFromCollection(nameOrId).then(() => onConfirm())}
        />
    </Menu.ContextMenu>
);




interface CreateCollectionModalProps {
    gif: Gif;
    onClose: () => void,
    createCollection: (name: string, gifs: Gif[]) => void;
}

function CreateCollectionModal({ gif, createCollection, onClose }: CreateCollectionModalProps) {

    const [name, setName] = React.useState("");
    return (
        <>
            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Collection Name</Forms.FormTitle>
                <TextInput
                    onChange={(e: string) => setName(e)}
                />

            </ModalContent>
            <ModalFooter>
                <Button
                    color={Button.Colors.GREEN}
                    disabled={!name.length}
                    onClick={() => {
                        if (!name.length) return;
                        createCollection(name, [gif]);
                        onClose();
                    }}
                >
                    Create
                </Button>
            </ModalFooter>
        </>
    );
}


