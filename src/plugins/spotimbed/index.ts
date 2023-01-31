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

import "./spotimbed.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Embed, Message } from "discord-types/general";

import { createSpotimbed, Spotimbed } from "./components/Embed";
import { settings } from "./settings";
import { createEmbedData, getEmbeddableLinks } from "./utils/ast";

export default definePlugin({
    name: "SpotiMbed",
    authors: [Devs.Vap],
    description: "Your mom",
    patches: [
        {
            find: ".renderEmbeds=function(",
            replacement: {
                match: /\.renderEmbeds=function\((\i)\)\{/,
                replace: "$&$1={...$1,embeds:$self.patchEmbeds($1)};",
            }
        },
        {
            find: '.provider&&"Spotify"===',
            replacement: {
                match: /(?<="Spotify"===\i\.provider\.name\?\(0,\i\.jsx\)\()\i(?=,)/,
                replace: "$self.createSpotimbed",
            },
        },
    ],
    settings,

    settingsAboutComponent: ({ tempSettings }) => createSpotimbed({
        embed: {
            url: "https://open.spotify.com/track/6a4z5B7vOzTLYTnokxuDXo"
        },
        tempSettings,
    }),

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
