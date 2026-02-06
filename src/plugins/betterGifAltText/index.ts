/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
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
            find: ".modalContext})};",
            replacement: {
                match: /(return.{0,10}\.jsx.{0,50}isWindowFocused)/,
                replace:
                    "$self.altify(e);$1",
            },
        },
        {
            find: "#{intl::GIF}",
            replacement: {
                match: /alt:(\i)=(\i\.\i\.string\(\i\.\i#{intl::GIF}\))(?=,[^}]*\}=(\i))/,
                replace:
                    // rename prop so we can always use default value
                    "alt_$$:$1=$self.altify($3)||$2",
            },
        },
    ],

    altify(props: any) {
        props.alt ??= "GIF";
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
