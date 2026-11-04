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
import { managedStyleRootNode } from "@api/Styles";
import { Devs } from "@utils/constants";
import { createAndAppendStyle } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { Channel } from "@vencord/discord-types";

let style: HTMLStyleElement;

const settings = definePluginSettings({
    blurAmount: {
        type: OptionType.NUMBER,
        description: "Blur Amount (in pixels)",
        default: 10,
        onChange: setCss
    },
    ignoredChannels: {
        type: OptionType.STRING,
        description: "List of channel IDs to not blur attachments in, separated by a space or comma",
        default: "",
        multiline: true,
    }
});

function setCss() {
    style.textContent = `
        .vc-nsfw-img [class*=imageContainer],
        .vc-nsfw-img [class*=wrapperPaused] {
            filter: blur(${settings.store.blurAmount}px);
            transition: filter 0.2s;

            &:hover {
                filter: blur(0);
            }
        }
        `;
}

export default definePlugin({
    name: "BlurNSFW",
    description: "Blur attachments in NSFW channels until hovered",
    tags: ["Privacy", "Appearance"],
    authors: [Devs.Ven],
    settings,

    shouldBlur(channel?: Channel) {
        if (!channel?.nsfw) return false;
        const { ignoredChannels } = settings.store;
        return !ignoredChannels.includes(channel.id) && !ignoredChannels.includes(channel.parent_id);
    },

    patches: [
        {
            find: "}renderStickersAccessories(",
            replacement: [
                {
                    match: /(\.renderReactions\(\i\).+?className:)/,
                    replace: '$&($self.shouldBlur(this?.props?.channel)?"vc-nsfw-img ":"")+'
                }
            ]
        }
    ],

    start() {
        style = createAndAppendStyle("VcBlurNsfw", managedStyleRootNode);

        setCss();
    },

    stop() {
        style?.remove();
    }
});
