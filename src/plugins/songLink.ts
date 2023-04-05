/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Ryan Cao
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

import { addPreSendListener, MessageObject, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const regexes = {
    spotify: /https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/g,
    appleMusic: /https:\/\/geo\.music\.apple\.com\/[a-z]+\/album\/_\/[0-9]+\?i=[0-9]+/g,
    deezer: /https:\/\/www\.deezer\.com\/track\/[0-9]+/g,
    tidal: /https:\/\/listen\.tidal\.com\/track\/[0-9]+/g
};

export default definePlugin({
    name: "SongLink",
    description: "Change links from Spotify, Apple Music, Deezer, and TIDAL into SongLinks",
    authors: [Devs.RyanCaoDev],
    dependencies: ["MessageEventsAPI"],

    replaceSongLink(msg: MessageObject) {
        for (const re of Object.values(regexes)) {
            msg.content = msg.content.replaceAll(re, "https://song.link/$&");
        }
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.replaceSongLink(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
