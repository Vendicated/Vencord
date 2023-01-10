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
import { wordsFromCamel, wordsToTitle } from "@utils/text";
import definePlugin, { OptionType } from "@utils/types";
import type { Embed, Message } from "discord-types/general";

import cssText from "~fileContent/spotimbed.css";

import { createSpotimbed, Spotimbed } from "./components/Embed";
import { ColorStyle } from "./types";
import { createEmbedData, getEmbeddableLinks } from "./utils/ast";

const colorMethodNames = Object.values(ColorStyle);
let style: HTMLStyleElement | null = null;

export default definePlugin({
    name: "SpotiMbed",
    authors: [Devs.Vap],
    description: "Your mom",
    patches: [
        {
            find: ".renderEmbeds=function(",
            replacement: {
                match: /\.renderEmbeds=function\((\w+)\)\{/,
                replace: "$&$1={...$1,embeds:Vencord.Plugins.plugins.SpotiMbed.patchEmbeds($1)};",
            }
        },
        {
            find: '.provider&&"Spotify"===',
            replacement: {
                match: /(?<="Spotify"===\w+\.provider\.name\?\(0,.\.jsx\)\()\w+(?=,)/,
                replace: "Vencord.Plugins.plugins.SpotiMbed.createSpotimbed",
            },
        },
    ],

    start() {
        style = document.createElement("style");
        style.innerText = cssText;
        document.head.appendChild(style);
    },
    stop() {
        style?.remove();
    },

    options: {
        colorStyle: {
            description: "Color Style",
            type: OptionType.SELECT,
            options: colorMethodNames.map(name => ({
                label: wordsToTitle(wordsFromCamel(name)),
                value: name,
                default: name === "vibrant",
            })),
        },
        forceStyle: {
            description: "Force Style",
            type: OptionType.SLIDER,
            markers: [0, 100],
            default: 0,
            componentProps: {
                stickToMarkers: false,
                onValueRender: null,
            }
        }
    },

    // exports
    createSpotimbed,
    Spotimbed,
    patchEmbeds: (message: Message): Embed[] => {
        const embeds = message.embeds.filter(e => e.provider?.name !== "Spotify");

        const links = getEmbeddableLinks(message.content, "open.spotify.com");
        embeds.push(...links.map(link => createEmbedData(link) as Embed));

        return embeds;
    },
});
