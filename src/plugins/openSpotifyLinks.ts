/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
import definePlugin from "@utils/types";

export default definePlugin({
    name: "OpenSpotifyLinks",
    description: "Opens Spotify links in the Spotify client.",
    authors: [Devs.crwn],
    patches: [],

    start() {
        this.clickListener = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!(target instanceof HTMLAnchorElement)) return;

            const spotifyLinkRegex = /^https?:\/\/open\.spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)(\?.*)?$/;
            const match = target.href.match(spotifyLinkRegex);
            if (!match) return;

            VencordNative.native.openExternal(`spotify://${match[1]}/${match[2]}`);
            event.preventDefault();
        };

        window.addEventListener("click", this.clickListener, { capture: true });
    },

    stop() {
        window.removeEventListener("click", this.clickListener);
    },
});
