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

import { definePluginSettings, Settings } from "@api/settings";
import { Devs } from "@utils/constants";
import { makeLazy } from "@utils/misc";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Alerts, Button, ContextMenu, FluxDispatcher, Forms, Menu, React, TextInput } from "@webpack/common";
import { Message } from "discord-types/general";

import * as CollectionManager from "./CollectionManager";
import { GIF_COLLECTION_PREFIX, GIF_ITEM_PREFIX } from "./constants";
import { Category, Collection, Gif, Props } from "./types";
import { getFormat } from "./utils/getFormat";
import { getGifByMessageAndTarget as getGifByTargetAndMessage, getGifByTarget as getGifByUrlAndTarget } from "./utils/getGif";
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

export default definePlugin({
    name: "Gif Collection",
    // need better description eh
    description: "Allows you to have collections of gifs",
    authors: [Devs.Aria],
    dependencies: ["MenuItemDeobfuscatorAPI"],
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
                    match: /(.{1,2}\.renderContent=function\(\){)(.{1,50}resultItems)/,
                    replace: "$1;Vencord.Plugins.plugins[\"Gif Collection\"].renderContent(this);$2"
                },
                // Delete context menu for collection
                {
                    match: /(.{1,2}\.render=function\(\){.{1,100}renderExtras.{1,200}onClick:this\.handleClick,)/,
                    replace: "$1onContextMenu: (e) => Vencord.Plugins.plugins[\"Gif Collection\"].collectionContextMenu(e, this),"
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
                match: /(function .{1,3}\((?<query>.{1,3}),.{1,3}\){.{1,200}dispatch\({type:"GIF_PICKER_QUERY".{1,20};)/,
                replace:
                    `$1 if($<query>.startsWith('${GIF_COLLECTION_PREFIX}')) {
                    const collection = Vencord.Plugins.plugins["Gif Collection"].collections.find(c => c.name === $<query>);
                    if(collection != null) { return };
                };`
            }
        },

        {
            // Stolen from message logger
            find: "id:\"remove-reactions\"",
            replacement: [
                {
                    // adds our contextmenu after the end of the first message context menu group
                    match: /\[(""===.{1,200})\](.{1,10},)/,
                    replace: "[$1, Vencord.Plugins.plugins['Gif Collection'].makeMenu(arguments[0].message, arguments[0].itemHref, arguments[0]._vencordTarget)]$2"
                }
            ]
        },
        // Ven goated ong on me
        {
            find: "open-native-link",
            replacement: {
                match: /id:"open-native-link".{0,200}\(\{href:(.{0,3}),.{0,200}\},"open-native-link"\)/,
                replace: (m, src) =>
                    `${m},Vencord.Plugins.plugins['Gif Collection'].makeMenu(null, ${src}, arguments[2])`
            }
        },
        {
            // pass the target to the open link menu so we can check if it's an image
            find: ".Messages.MESSAGE_ACTIONS_MENU_LABEL",
            predicate: makeLazy(() => !Settings.plugins.ReverseImageSearch.enabled),
            noWarn: true,
            replacement: [
                {
                    match: /ariaLabel:\i\.Z\.Messages\.MESSAGE_ACTIONS_MENU_LABEL/,
                    replace: "$&,_vencordTarget:arguments[0].target"
                },
                {
                    // var f = props.itemHref, .... MakeNativeMenu(null != f ? f : blah)
                    match: /(\i)=\i\.itemHref,.+?\(null!=\1\?\1:.{1,10}(?=\))/,
                    replace: "$&,arguments[0]._vencordTarget"
                }
            ]
        }
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

    hidePrefix(props: Category) {
        return props.name.split(":").length > 1 ? props.name.replace(/.+?:/, "") : props.name;
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

    collectionContextMenu(e: React.UIEvent, instance) {
        const { item } = instance.props;
        if (item?.name?.startsWith(GIF_COLLECTION_PREFIX))
            return ContextMenu.open(e, () =>
                <RemoveItemContextMenu
                    type="collection"
                    onConfirm={() => { this.sillyInstance && this.sillyInstance.forceUpdate(); }}
                    nameOrId={instance.props.item.name} />
            );
        if (item?.id?.startsWith(GIF_ITEM_PREFIX))
            return ContextMenu.open(e, () =>
                <RemoveItemContextMenu
                    type="gif"
                    onConfirm={() => { this.sillyContentInstance && this.sillyContentInstance.forceUpdate(); }}
                    nameOrId={instance.props.item.id}
                />);

        const { src, url, height, width } = item;
        if (src && url && height != null && width != null && !item.id?.startsWith(GIF_ITEM_PREFIX))
            return ContextMenu.open(e, () =>
                <Menu.ContextMenu
                    navId="gif-collection-id"
                    onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                    aria-label="Gif Collections"
                >

                    {this.renderMenu({ ...item, id: uuidv4() })}

                </Menu.ContextMenu>
            );
        return null;
    },

    // for some reason this method bothering me
    makeMenu(message: Message | null, url: string | null, target: HTMLDivElement | null) {
        if (message && target && !url) {
            const gif = getGifByTargetAndMessage(target, message);
            if (!gif) return null;

            return this.renderMenu(gif);
        }
        if (url && target && !message) {
            // youtube thumbnail url is message link for some reason eh
            const gif = getGifByUrlAndTarget(url.startsWith("https://discord.com/") ? target.parentElement?.querySelector("img")?.src ?? url : url, target);
            if (!gif) return null;

            return this.renderMenu(gif);
        }
    },

    renderMenu(gif: Gif) {
        return (
            <Menu.MenuItem
                label="Add To Collection"
                key="add-to-collection"
                id="add-to-collection"
            >
                {this.collections.map(col => (
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
                    confirmColor: Button.Colors.RED,
                    cancelText: "Nevermind",
                    onConfirm: async () => {
                        await CollectionManager.deleteCollection(nameOrId);
                        onConfirm();
                    }
                }) : CollectionManager.removeFromCollection(nameOrId).then(() => onConfirm())}
        >

        </Menu.MenuItem>
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


