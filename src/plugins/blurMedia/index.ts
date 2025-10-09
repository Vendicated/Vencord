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

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
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
    onlyNSFW: {
        type: OptionType.BOOLEAN,
        description: "Only blur media in NSFW channels",
        default: true,
    }
});

function setCss() {
    style.textContent = `
        .vc-blurMedia-blur [class^=imageContainer],
        .vc-blurMedia-blur [class^=wrapperPaused] {
            filter: blur(${settings.store.blurAmount}px);
            transition: filter 0.2s;

            &:hover {
                filter: blur(0);
            }
        }
        `;
}

migratePluginSettings("BlurMedia", "BlurNSFW");
export default definePlugin({
    name: "BlurMedia",
    description: "Blur attachments in channels until hovered",
    authors: [Devs.Ven],
    settings,

    patches: [
        {
            find: "}renderEmbeds(",
            replacement: [{
                match: /\.container/,
                replace: "$&+$self.getClassName(this?.props?.channel)"
            }]
        }
    ],

    getClassName(channel: Channel | undefined): string {
        if (settings.store.onlyNSFW) {
            return channel?.nsfw ? " vc-blurMedia-blur" : "";
        }
        return " vc-blurMedia-blur";
    },

    start() {
        style = document.createElement("style");
        style.id = "VcBlurNsfw";
        document.head.appendChild(style);

        setCss();
    },

    stop() {
        style?.remove();
    }
});
