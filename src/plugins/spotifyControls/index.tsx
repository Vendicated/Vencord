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

import { Settings } from "../../api/settings";
import { Devs } from "../../utils/constants";
import definePlugin, { OptionType } from "../../utils/types";
import { Player } from "./PlayerComponent";

export default definePlugin({
    name: "SpotifyControls",
    description: "Spotify Controls",
    authors: [Devs.Ven, Devs.afn, Devs.KraXen72, Devs.D3SOX],
    dependencies: ["MenuItemDeobfuscatorAPI"],
    patches: [
        {
            find: "showTaglessAccountPanel:",
            replacement: {
                // return React.createElement(AccountPanel, { ..., showTaglessAccountPanel: blah })
                match: /return ?(.{0,30}\(.{1,3},\{[^}]+?,showTaglessAccountPanel:.+?\}\))/,
                // return [Player, Panel]
                replace: "return [Vencord.Plugins.plugins.SpotifyControls.renderPlayer(),$1]"
            }
        },
        {
            // Patches Spotify auth link to add scopes required for liking songs (user-library-modify+user-library-read)
            // https://discord.com/api/v9/connections/spotify/authorize
            find: "authorize:function",
            predicate: () => Settings.plugins.SpotifyControls.manageSavedSongs === true,
            replacement:{
                match: /return (\w+)\.(\w+)\.get\(\{url:(\w+),oldFormErrors:!0\}\)/,
                replace: "return Vencord.Plugins.plugins.SpotifyControls.modifyAuthUrl($3,$1.$2.get({url:$3,oldFormErrors:!0}))"
            },
        },
        // Adds POST, DELETE and a Marker to the SpotifyAPI (so we can easily find it)
        {
            find: ".PLAYER_DEVICES",
            replacement: {
                match: /get:(.{1,3})\.bind\(null,(.{1,6})\.get\)/,
                replace: "SpotifyAPIMarker:1,post:$1.bind(null,$2.post),delete:$1.bind(null,$2.delete),$&"
            }
        },
        // Discord doesn't give you the repeat kind, only a boolean
        {
            find: 'repeat:"off"!==',
            replacement: {
                match: /repeat:"off"!==(.{1,3}),/,
                replace: "actual_repeat:$1,$&"
            }
        }
    ],

    options: {
        manageSavedSongs: {
            description: "Show a button to manage your saved songs (You need to re-authenticate Spotify for it to work)",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        },
        savedSongsDisplay: {
            disabled: () => Settings.plugins.SpotifyControls.manageSavedSongs === false,
            description: "Where to show the saved songs button",
            type: OptionType.SELECT,
            default: "context",
            options: [
                { label: "Context menu", value: "context", default: true },
                { label: "Extra icon", value: "icon" }
            ],
        },
    },

    async modifyAuthUrl(url: string, promise: Promise<any>) {
        if (url.includes("/connections/spotify/authorize")) {
            const test = await promise;
            if (test?.body?.url) {
                test.body.url = test.body.url.replace("&scope=", "&scope=user-library-modify+user-library-read+");
            }
            return test;
        }
        return promise;
    },

    renderPlayer: () => <Player />
});
