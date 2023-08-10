/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "BetterGifAltText",
    authors: [Devs.Ven],
    description:
        "Change GIF alt text from simply being 'GIF' to containing the gif tags / filename",
    patches: [
        {
            find: "onCloseImage=",
            replacement: {
                match: /(return.{0,10}\.jsx.{0,50}isWindowFocused)/,
                replace:
                    "$self.altify(e);$1",
            },
        },
        {
            find: ".embedGallerySide",
            replacement: {
                match: /(?<==(.{1,3})\.alt.{0,20})\?.{0,5}\.Messages\.GIF/,
                replace:
                    "?($1.alt='GIF',$self.altify($1))",
            },
        },
    ],

    altify(props: any) {
        if (props.alt !== "GIF") return props.alt;

        let url: string = props.original || props.src;
        try {
            url = decodeURI(url);
        } catch { }

        let name = url
            .slice(url.lastIndexOf("/") + 1)
            .replace(/\d/g, "") // strip numbers
            .replace(/.gif$/, "") // strip extension
            .split(/[,\-_ ]+/g)
            .slice(0, 20)
            .join(" ");
        if (name.length > 300) {
            name = name.slice(0, 300) + "...";
        }

        if (name) props.alt += ` - ${name}`;

        return props.alt;
    },
});
