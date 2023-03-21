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

import { ResourceType } from "@api/Spotify";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Embed, Message } from "discord-types/general";

import { createSpotimbed, Spotimbed } from "./components/Embed";
import { settings } from "./settings";
import { createEmbedData, getEmbeddableLinks } from "./utils/ast";

export default definePlugin({
    name: "SpotiMbed",
    description: "Makes Spotify embeds reliable and actually useable",
    authors: [Devs.Vap],
    dependencies: ["SpotifyAPI"],
    patches: [
        {
            find: ".renderEmbeds=function(",
            replacement: {
                // .renderEmbeds = function(message) { ... }
                match: /\.renderEmbeds=function\((\i)\)\{/,
                // .renderEmbeds = function(message) { message = patchedMessage }
                replace: "$&$1=$self.patchMessage($1);",
            }
        },
        {
            find: '.provider&&"Spotify"===',
            replacement: {
                // "Spotify" === embed.provider.name ? <DiscordEmbed embed={embed} /> : ...
                match: /(?<="Spotify"===\i\.provider\.name\?\(0,\i\.jsx\)\()\i(?=,)/,
                // "Spotify" === embed.provider.name ? <SpotiMbed embed={embed} /> : ...
                replace: "$self.createSpotimbed",
            },
        },
    ],
    settings,

    settingsAboutComponent: ({ tempSettings }) => <ErrorBoundary>
        <Spotimbed type={ResourceType.Track} id="6a4z5B7vOzTLYTnokxuDXo" tempSettings={tempSettings} />
        <Spotimbed type={ResourceType.Album} id="6MbBpKe8dZYYqOq0AxpQps" tempSettings={tempSettings} />
    </ErrorBoundary>,

    // exports
    createSpotimbed,
    Spotimbed,
    patchMessage: (message: Message): Message => {
        const embeds = message.embeds.filter(e => e.provider?.name !== "Spotify");

        const links = getEmbeddableLinks(message.content, "open.spotify.com");
        embeds.push(...links.map(link => createEmbedData(link) as Embed));

        return new Proxy(message, {
            get(target, prop) {
                if (prop === 'embeds') return embeds;
                return Reflect.get(target, prop);
            }
        });
    },
});
