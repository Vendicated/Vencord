/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory, disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";

import style from "./styles.css?managed";

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

function stripUrl(url: string) {
    return url.split("?")[0];
}

const settings = definePluginSettings({
    allowSound: {
        type: OptionType.BOOLEAN,
        default: false,
        name: "Allow Sound",
        description: "Allow videos to play sound in the GIF picker."
    }
});

export default definePlugin({
    name: "FavoriteAnything",
    authors: [Devs.MrDiamond],
    description: "Allows you to save images/videos to their favorite GIFs.",

    settings,

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
                    muted={!settings.store.allowSound}
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
        props.src = stripUrl(props.src);
        props.url = stripUrl(props.url);
        console.log(props.src, props.url);
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
        // favorite star, works by just rendering it always and letting css do the rest
        {
            find: ".IMAGE_OPEN_DIALOG_DESCRIPTION",
            replacement: {
                match: /children:\i\}\):null/g,
                replace: "$&,(this.props.alt==\"GIF\"?null:$self.gifAccessoryRender({src:this.props.src,width:this.props.width,height:this.props.height,url:this.props.src,format:2}))"
            }
        },
        // gif icon
        {
            find: "GifIcon:",
            replacement: [
                {
                    match: /viewBox:"0 0 24 24",/g,
                    replace: "viewbox:\"0 0 576 512\","
                },
                {
                    match: /width:e,height:i/g,
                    replace: "$&,className:\"vc-favorite-anything-gif-icon\""
                }
            ]
        }
    ],

    start() {
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
    }
});
