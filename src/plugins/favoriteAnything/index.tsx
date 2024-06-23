/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";

const GifAccessory = findComponentByCodeLazy("GIF_TOOLTIP_REMOVE_FROM_FAVORITES");

const cl = classNameFactory("vc-favorite-anything-");

const videoExtensions = ["mp4", "webm", "mov"];
const imageExtensions = ["png", "jpg", "jpeg", "gif", "webp", "apng"];

enum GIFType {
    NONE = 0,
    IMAGE,
    VIDEO
}

type FavoriteGif = {
    src: string;
    width: number;
    height: number;
    order: number;
    format: GIFType;
};

type MenuGifProps = {
    coords: {
        top: number;
        left: number;
        width: number;
        height: number;
    };
    item: FavoriteGif;
};

function getFileType(url: string) {
    url = url.split("?")[0];
    const split = url.split(".");
    return split[split.length - 1];
}

export default definePlugin({
    name: "FavoriteAnything",
    authors: [
        {
            id: 12345n,
            name: "Your Name",
        },
    ],
    description: "Allows you to save images/videos to their favorite GIFs.",

    menuGifElement(props: MenuGifProps) {
        const gif = props.item;

        const fileType = getFileType(gif.src);
        if (videoExtensions.includes(fileType)) {
            return (
                <video
                    src={gif.src}
                    width={props.coords.width}
                    height={props.coords.height}
                    autoPlay
                    loop
                    muted
                    controls={false}
                    preload="auto"
                    className={cl("gif")}
                />
            );
        } else if (imageExtensions.includes(fileType)) {
            return <img
                src={gif.src}
                width={props.coords.width}
                height={props.coords.height}
                className={cl("gif")}
            />;
        } else {
            return null;
        }
    },

    gifAccessoryRender(props: { width: number; height: number; src: string; url: string; format: GIFType; }) {
        if (getFileType(props.src) === "gif") return null;
        return <GifAccessory {...props} className={cl("accessory")} />;
    },

    patches: [
        // gif picker needs to be patched to allow for images to render properly
        {
            find: ".default.Messages.GIF_PICKER_RELATED_SEARCH",
            replacement: [
                {
                    match: /(if\(\i!==\i\.GIFType\.VIDEO\|\|null==\i\)return;let \i=)(\i.getElement\(\))/g,
                    replace: "$1this.props.item.type?$2:document.createElement('div')"
                },
                {
                    match: /\i\(\i\)\?null:this\.renderGIF\(\)/g,
                    replace: "this.props.item.type?($&):$self.menuGifElement(this.props)"
                }
            ]
        },
        // favorite star
        {
            find: "/\\.(mp3|m4a|ogg|wav|flac)$/i",
            replacement: {
                match: /children:(\i)=>\i\(\i\)\}\):\i\(\)\}\),\i/g,
                replace: "$&,$self.gifAccessoryRender({src:$1.attachment.url,width:$1.maxWidth,height:$1.maxHeight,url:$1.attachment.url,format:2})"
            }
        }
    ]
});