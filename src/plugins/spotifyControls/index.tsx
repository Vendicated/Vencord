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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { Player } from "./PlayerComponent";

function toggleHoverControls(value: boolean) {
    document.getElementById("vc-spotify-hover-controls")?.remove();
    if (value) {
        const style = document.createElement("style");
        style.id = "vc-spotify-hover-controls";
        style.textContent = `
.vc-spotify-button-row { height: 0; opacity: 0; will-change: height, opacity; transition: height .2s, opacity .05s; }
#vc-spotify-player:hover .vc-spotify-button-row { opacity: 1; height: 32px; }
`;
        document.head.appendChild(style);
    }
}

export default definePlugin({
    name: "SpotifyControls",
    description: "Spotify Controls",
    authors: [Devs.Ven, Devs.afn, Devs.KraXen72],
    dependencies: ["MenuItemDeobfuscatorAPI", "SpotifyAPI"],
    options: {
        hoverControls: {
            description: "Show controls on hover",
            type: OptionType.BOOLEAN,
            default: false,
            onChange: v => toggleHoverControls(v)
        },
    },
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
    ],
    start: () => toggleHoverControls(Settings.plugins.SpotifyControls.hoverControls),
    renderPlayer: () => <Player />
});
