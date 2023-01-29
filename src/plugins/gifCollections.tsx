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
import { makeLazy } from "@utils/misc";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Forms, Menu, React, TextInput } from "@webpack/common";
import { Settings } from "Vencord";

// welp
export enum Format { NONE = 0, IMAGE = 1, VIDEO = 2 }

export interface Category {
    type: "Trending" | "Category";
    name: string;
    src: string;
    format: Format;
    gifs?: Gif[];
}

export interface Gif {
    src: string;
    url: string;
}

export interface Props {
    favorites: { [src: string]: any; };
    trendingCategories: Category[];
}

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type Collection = WithRequired<Category, "gifs">;


// goose gang
function getLocalStoragePropertyDescriptor() {
    const frame = document.createElement("frame");
    frame.src = "about:blank";

    document.body.appendChild(frame);

    const r = Object.getOwnPropertyDescriptor(frame.contentWindow, "localStorage");

    frame.remove();

    return r;
}

const fixLocalStorage = () => {
    Object.defineProperty(window, "localStorage", getLocalStoragePropertyDescriptor()!);
};

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
            predicate: makeLazy(() => !Settings.plugins.ReverseImageSearch.enabled),
            noWarn: true,
            replacement: {
                match: /(?<props>.).onHeightUpdate.{0,200}(.)=(.)=.\.url;.+?\(null!=\3\?\3:\2[^)]+/,
                replace: "$&,$<props>.target"
            }
        }
    ],

    start() {
        fixLocalStorage();
    },

    oldTrendingCat: null as Category[] | null,

    get collections(): Collection[] {
        return JSON.parse(localStorage.getItem(`${this.name}-collections`) ?? "[]");
    },

    set collections(val: Collection[]) {
        localStorage.setItem(`${this.name}-collections`, JSON.stringify(val));
    },

    get_url_extension(url: string) {
        return url.split(/[#?]/)[0].split(".").pop()?.trim();
    },

    renderContent(instance) {
        if (instance.props.query.startsWith("gc:")) {
            const collection = this.collections.find(c => c.name === instance.props.query);
            if (!collection) return;
            instance.props.resultItems = collection.gifs.map(g => ({
                // only works for tennor gifs
                id: g.src.split("-")[g.src.split("-").length - 1],
                format: this.get_url_extension(g.src) === "mp4" || this.get_url_extension(g.src) == null ? Format.VIDEO : Format.IMAGE,
                src: g.src,
                url: g.url,
                // If ya dont have any favriouts this will error :| idk how they get the width and height ill figure it out later
                width: instance.props.favorites[0].width,
                height: instance.props.favorites[0].height
            }));
        }

    },

    hidePrefix(props: Category) {
        const res = props.name.split(":");
        return res.length > 1 ? res[1] : res[0];
    },

    createCollection(name: string, gifs: Gif[] = []) {
        const tempCol = this.collections;
        tempCol.push({
            name: `gc:${name}`,
            // // this is probably why settings dont save?????? its not
            // get src() {
            //     return this.gifs.length ? this.gifs[0].src : "";
            // },
            src: gifs.length ? gifs[0].src : "",
            // i dont think is matters /shrug
            format: this.get_url_extension(gifs[0].src) === "mp4" || this.get_url_extension(gifs[0].src) == null ? Format.VIDEO : Format.IMAGE,
            type: "Category",
            gifs
        });

        this.collections = tempCol;

    },

    addToCollection(collectionName: string, src: string, url: string) {
        const tempCol = this.collections;
        const colIndex = tempCol.findIndex(col => col.name === collectionName);
        if (colIndex === -1) return console.warn("cant find that collection eh");

        tempCol[colIndex].gifs?.push({ src, url });
        return this.collections = tempCol;
    },

    insertCollections(instance: { props: Props; }) {
        try {
            if (instance.props.trendingCategories.length && instance.props.trendingCategories[0].type === "Trending")
                this.oldTrendingCat = instance.props.trendingCategories;


            if (this.oldTrendingCat != null)
                instance.props.trendingCategories = this.collections.concat(this.oldTrendingCat as Collection[]);

        } catch (err) {
            console.error(err);
        }
    },



    makeMenu(url: string, target: HTMLElement) {
        if (target && !(target instanceof HTMLImageElement) && target.attributes["data-role"]?.value !== "img")
            return null;

        // oh my. WHY do i have to check if its null twice :|
        const src = target != null ? (target.nextElementSibling?.firstElementChild as HTMLVideoElement)?.src ?? url : url;
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
                            action={() => this.addToCollection(col.name, src, url)}
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
                                <BruhModal onClose={modalProps.onClose} createCollection={this.createCollection.bind(this)} src={src} url={url} />
                            </ModalRoot>
                        ));
                    }}
                />
            </Menu.MenuItem>
        );
    }
});

interface ModalProps {
    src: string,
    url: string,
    onClose: () => void,
    createCollection: (name: string, gifs?: Gif[]) => void;
}

function BruhModal({ src, url, createCollection, onClose }: ModalProps) {

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
                        createCollection(name, [{ src, url }]);
                        onClose();
                    }}
                >
                    Create
                </Button>
            </ModalFooter>
        </>
    );
}


