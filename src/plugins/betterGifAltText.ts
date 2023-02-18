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
            find: 'preload:"none","aria',
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
