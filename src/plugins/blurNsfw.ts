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

import { Settings } from "../api/settings";
import { Devs } from "../utils/constants";
import definePlugin, { OptionType } from "../utils/types";

export default definePlugin({
    name: "BlurNSFW",
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

    options: {
        blurAmount: {
            type: OptionType.NUMBER,
            description: "Blur Amount",
            default: 10,
        }
    },

    start() {
        const style = this.style = document.createElement("style");
        style.id = "VcBlurNsfw";
        document.head.appendChild(style);

        this.setCss();
    },

    setCss() {
        this.style.textContent = `
        .vc-nsfw-img [class^=imageWrapper] img {
            filter: blur(${Settings.plugins.BlurNSFW.blurAmount}px);
            transition: filter 0.2s;
        }
        .vc-nsfw-img [class^=imageWrapper] img:hover {
            filter: unset;
        }
        `;
    },

    stop() {
        this.style?.remove();
    }
});
