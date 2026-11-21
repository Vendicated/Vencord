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
    noSpotifyAutoPause: {
        description: "Disable Spotify auto-pause",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    keepSpotifyActivityOnIdle: {
        description: "Keep Spotify activity playing when idling",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "SpotifyCrack",
    description: "Free listen along, no auto-pausing in voice chat, and allows activity to continue playing when idling",
    tags: ["Media", "Utility", "Activity"],
    authors: [Devs.Cyn, Devs.Nuckyz],
    settings,

    patches: [
        {

            find: 'dispatch({type:"SPOTIFY_PROFILE_UPDATE"',
            replacement: [
                {
                    match: /SPOTIFY_PROFILE_UPDATE.+?isPremium:(?="premium"===(\i)\.body\.product)/,
                    replace: (m, req) => `${m}(${req}.body.product="premium")&&`
                },
                {
                    match: /return (\i)(\.put\((\i,\i),\{url:\i\.\i\.PLAYER_PLAY.+?uris:null==(\i)\?\[(\i)\].+?\}\}\))/,
                    replace: "return $self.getAlbumUri($1,$3,$5,$4).then(vcUri=>($4=vcUri,$1$2))"
                }
            ]
        },
        {
            find: "}getPlayableComputerDevices(){",
            replacement: [
                {
                    predicate: () => settings.store.noSpotifyAutoPause,
                    match: /(?<=function \i\(\){)(?=.{0,200}SPOTIFY_AUTO_PAUSED\))/,
                    replace: "return;"
                },
                {
                    predicate: () => settings.store.keepSpotifyActivityOnIdle,
                    match: /(shouldShowActivity\(\){.{0,50})&&!\i\.\i\.isIdle\(\)/,
                    replace: "$1"
                }
            ]
        }
    ],

    async getAlbumUri(api: any, accountId: string, accessToken: string, uri: string, contextUri?: string) {
        const [, type, id] = uri.split(":");
        if (contextUri != null || type !== "track") return contextUri;

        try {
            const { body } = await api.get(accountId, accessToken, { url: `https://api.spotify.com/v1/tracks/${id}` });
            return body.album.uri;
        } catch {
            return undefined;
        }
    }
});
