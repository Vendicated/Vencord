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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    blurAmount: {
        type: OptionType.NUMBER,
        description: "Blur Amount",
        default: 10,
        onChange: () => setCss()
    },
    blurDirectMessage: {
        type: OptionType.BOOLEAN,
        description: "Blur Images in Direct Messages",
        default: false,
    }
});

let style: HTMLStyleElement;

function setCss() {
    if (!style) return;
    const blurValue = settings.store.blurAmount ?? 10;
    
    style.textContent = `
        /* Blur for NSFW channels */
        .vc-nsfw-img [class^=imageWrapper] img,
        .vc-nsfw-img [class^=wrapperPaused] video {
            filter: blur(${blurValue}px);
            transition: filter 0.2s;
        }
        
        /* Blur for DMs when enabled */
        .vc-dm-blur [class^=imageWrapper] img,
        .vc-dm-blur [class^=wrapperPaused] video {
            filter: blur(${blurValue}px);
            transition: filter 0.2s;
        }
        
        /* Remove blur on hover for both NSFW and DMs */
        .vc-nsfw-img [class^=imageWrapper]:hover img,
        .vc-nsfw-img [class^=wrapperPaused]:hover video,
        .vc-dm-blur [class^=imageWrapper]:hover img,
        .vc-dm-blur [class^=wrapperPaused]:hover video {
            filter: unset;
        }
    `;
}

function getDmClass(channel: any) {
    if (!channel) return '';
    // Check for both DM (1) and Group DM (3)
    if (channel.type !== 1 && channel.type !== 3) return '';
    return settings.store.blurDirectMessage ? ' vc-dm-blur' : '';
}

export default definePlugin({
    name: "BlurNSFW",
    description: "Blur attachments in NSFW channels and DMs until hovered",
    authors: [Devs.Ven],

    patches: [
        {
            find: ".embedWrapper,embed",
            replacement: {
                match: /\.container/,
                replace: (_match: string) => {
                    return `.container+(this.props.channel.nsfw?' vc-nsfw-img':'')+$self.getDmClass(this.props.channel)`;
                }
            }
        }
    ],

    getDmClass,
    settings,

    start() {
        style = document.createElement("style");
        style.id = "VcBlurNSFW";
        document.head.appendChild(style);
        setCss();
    },

    stop() {
        style?.remove();
    }
});
