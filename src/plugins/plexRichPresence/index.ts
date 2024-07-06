/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Sofia Lima
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

import PlexRichPresence from "./master";

let client: PlexRichPresence;

export const settings = definePluginSettings({
    server: {
        type: OptionType.SELECT,
        description: "What server do you want to use?",
        options: [
            {
                label: "Plex",
                value: "plex",
            },
            {
                label: "Emby",
                value: "emby",
            }
        ],
        default: "Plex",
        onChange: (value: string) => {
            if (client) {
                client.stopClient();
                client = new PlexRichPresence();
            }
        }
    },
    tmdbApiKey: {
        type: OptionType.STRING,
        description: "The Movie Database API key",
        placeholder: "Use a valid readonly api key",
        default: ""
    },
    serverApiKey: {
        type: OptionType.STRING,
        description: "Server Api Key",
        placeholder: "Your Server Api Key here",
        default: ""
    },
    serverAddress: {
        type: OptionType.STRING,
        description: "Server address",
        placeholder: "https://server.url:32400",
        default: ""
    },
    users: {
        type: OptionType.STRING,
        description: "Users to fetch (Comma separated)",
        default: "jhoan,risas"
    },
    musicFirstRow: {
        type: OptionType.STRING,
        description: "First field (Music)",
        default: "Listening"
    },
    musicSecondRow: {
        type: OptionType.STRING,
        description: "Second field (Music)",
        default: "{title} ({album})"
    },
    musicThirdRow: {
        type: OptionType.STRING,
        description: "Third field (Music)",
        default: "by {artist}"
    },
    movieFirstRow: {
        type: OptionType.STRING,
        description: "First field (Movies)",
        default: "Watching"
    },
    movieSecondRow: {
        type: OptionType.STRING,
        description: "Second field (Movies)",
        default: "{title} ({year})"
    },
    movieThirdRow: {
        type: OptionType.STRING,
        description: "Third field (Movies)",
        default: "{genre}, {director}"
    },
    episodeFirstRow: {
        type: OptionType.STRING,
        description: "First field (Episodes)",
        default: "Watching"
    },
    episodeSecondRow: {
        type: OptionType.STRING,
        description: "Second field (Episodes)",
        default: "{title}"
    },
    episodeThirdRow: {
        type: OptionType.STRING,
        description: "Third field (Episodes)",
        default: "{episode} ({sn:ep})"
    }
});

export default definePlugin({
    name: "PlexRPC",
    description: "Show your Plex status in the Discord rich presence.",
    authors: [Devs.Jhoan],
    settings,
    stop() {
        client?.stopClient();
    },
    start() {
        client = new PlexRichPresence();
    },
});
