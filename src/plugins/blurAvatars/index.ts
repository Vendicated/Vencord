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

import { Settings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

let style: HTMLStyleElement;

function setCss() {
    style.textContent = `
        img[src^="https://cdn.discordapp.com/avatars/"] {
            filter: blur(${Settings.plugins.BlurAvatars.blurAmount}px) !important;
            clip-path: circle(50% at 50% 50%);
        }

        img[src^="https://cdn.discordapp.com/guilds/"][src*="/avatars/"] {
            filter: blur(${Settings.plugins.BlurAvatars.blurAmount}px) !important;
            clip-path: circle(50% at 50% 50%);
        }
        `;
}

export default definePlugin({
    name: "BlurAvatars",
    description: "Avoid seeing unwanted avatars (e.g. NSFW avatars)",
    authors: [{
        name: "EchterTill",
        id: 630105655096770561n
    }],

    patches: [],

    options: {
        blurAmount: {
            type: OptionType.SLIDER,
            description: "Blur Amount (px)",
            markers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            default: 3,
            onChange: setCss
        }
    },

    start() {
        style = document.createElement("style");
        style.id = "BlurPfp";
        document.head.appendChild(style);

        setCss();
    },

    stop() {
        style?.remove();
    }
});
