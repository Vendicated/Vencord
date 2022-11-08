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

import { Devs } from "../../utils/constants";
import definePlugin from "../../utils/types";
import { Player } from "./PlayerComponent";

export default definePlugin({
    name: "SpotifyControls",
    description: "Spotify Controls",
    authors: [
        Devs.Ven,
        {
            id: 420043923822608384n,
            name: "afn",
        },
        {
            id: 379304073515499530n,
            name: "KraXen72"
        }
    ],
    dependencies: ["MenuItemDeobfuscatorApi"],
    patches: [
        {
            find: "showTaglessAccountPanel:",
            replacement: {
                // return React.createElement(AccountPanel, { ..., showTaglessAccountPanel: blah })
                match: /return (.{0,30}\(.{1,3},\{[^}]+?,showTaglessAccountPanel:.+?\}\))/,
                // return [Player, Panel]
                replace: "return [Vencord.Plugins.plugins.SpotifyControls.renderPlayer(),$1]"
            }
        },
        // Adds POST and a Marker to the SpotifyAPI (so we can easily find it)
        {
            find: ".PLAYER_DEVICES",
            replacement: {
                match: /get:(.{1,3})\.bind\(null,(.{1,6})\.get\)/,
                replace: "SpotifyAPIMarker:1,post:$1.bind(null,$2.post),$&"
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

    renderPlayer: () => <Player />
});
