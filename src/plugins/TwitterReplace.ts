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

import definePlugin, { OptionType } from "../utils/types";
import { addPreSendListener, MessageObject, removePreSendListener } from "../api/MessageEvents";
import { Devs } from "../utils/constants";
import { Settings } from "../Vencord";

const re = /https?:\/\/twitter\.com(?=\/\w+?\/status\/)/g;

export default definePlugin({
    name: "TwitterReplace",
    description: "Uses sites to improve embeds from Twitter when sending a message.",
    authors: [
        Devs.Samu,
        { name: "salad", id: 884947813744640020n }
    ],
    dependencies: ["MessageEventsAPI"],

    options: {
        url: {
            description: "URL replacement",
            type: OptionType.SELECT,
            options: [
                { label: "vxtwitter", value: "https://vxtwitter.com/", default: true },
                { label: "fxtwitter", value: "https://fxtwitter.com/" },
                { label: "twxtter", value: "https://twxtter.com/" },
                { label: "sxtwitter", value: "https://sxtwitter.com/" },
            ],
        },
    },

    addPrefix(msg: MessageObject) {
        msg.content = msg.content.replace(re, Settings.plugins.TwitterReplace.url);
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.addPrefix(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
