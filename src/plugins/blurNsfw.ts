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

import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "BlurNsfw",
    description: "Blur attachments in NSFW channels until hovered",
    authors: [Devs.Ven],

    patches: [
        {
            find: "().embedWrapper,embed",
            replacement: [{
                match: /(\.renderEmbed=.+?(.)=.\.props)(.+?\(\)\.embedWrapper)/g,
                replace: "$1,vcProps=$2$3+(vcProps.channel.nsfw?' vc-nsfw-img':'')"
            }, {
                match: /(\.renderAttachments=.+?(.)=this\.props)(.+?\(\)\.embedWrapper)/g,
                replace: "$1,vcProps=$2$3+(vcProps.channel.nsfw?' vc-nsfw-img':'')"
            }]
        }
    ],

    start() {
        const style = this.style = document.createElement("style");
        style.id = "VcBlurNsfw";
        document.head.appendChild(style);

        style.textContent = `
        .vc-nsfw-img img {
            filter: blur(5px);
            transition: filter 0.2s ease-in;
        }
        .vc-nsfw-img:hover img {
            filter: unset;
        }
        `;
    },

    stop() {
        this.style?.remove();
    }
});
