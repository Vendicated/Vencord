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

import { Settings } from "@api/settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import hoverOnlyStyle from "./hoverOnly.css?managed";
import { Player } from "./PlayerComponent";

function toggleHoverControls(value: boolean) {
    (value ? enableStyle : disableStyle)(hoverOnlyStyle);
}

export default definePlugin({
    name: "SpotifyControls",
    description: "Spotify Controls",
    authors: [Devs.Ven, Devs.afn, Devs.KraXen72],
    options: {
        hoverControls: {
            description: "Show controls on hover",
            type: OptionType.BOOLEAN,
            default: false,
            onChange: v => toggleHoverControls(v)
        },
        useSpotifyUris: {
            type: OptionType.BOOLEAN,
            description: "Open Spotify URIs instead of Spotify URLs. Will only work if you have Spotify installed and might not work on all platforms",
            default: false
        }
    },
    patches: [
        {
            find: "showTaglessAccountPanel:",
            replacement: {
                // return React.createElement(AccountPanel, { ..., showTaglessAccountPanel: blah })
                match: /return ?(.{0,30}\(.{1,3},\{[^}]+?,showTaglessAccountPanel:.+?\}\))/,
                // return [Player, Panel]
                replace: "return [$self.renderPlayer(),$1]"
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
    start: () => toggleHoverControls(Settings.plugins.SpotifyControls.hoverControls),
    renderPlayer: () => <Player />
});
