/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const ImageExtensionRe = /\.(png|jpg|jpeg|gif|webp|avif)$/i;
const GifHostRegex = /^(.+?\.)?(tenor|giphy|imgur)\.com$/i;

const settings = definePluginSettings({
    showFullUrl: {
        description: "Show the full URL of the image instead of just the file name. Always enabled for GIFs because they usually have no meaningful file name",
        type: OptionType.BOOLEAN,
        default: false,
    },
});

export default definePlugin({
    name: "ImageFilename",
    authors: [Devs.Ven],
    description: "Display the file name of images & GIFs as a tooltip when hovering over them",
    settings,

    patches: [
        {
            find: ".clickableWrapper",
            replacement: {
                match: /\.originalLink,href:(\i)/,
                replace: "$&,title:$self.getTitle($1)"
            }
        },
    ],

    getTitle(src: string) {
        try {
            const url = new URL(src);
            const isGif = GifHostRegex.test(url.hostname);
            if (!isGif && !ImageExtensionRe.test(url.pathname)) return undefined;

            return isGif || settings.store.showFullUrl
                ? src
                : url.pathname.split("/").pop();
        } catch {
            return undefined;
        }
    }
});
