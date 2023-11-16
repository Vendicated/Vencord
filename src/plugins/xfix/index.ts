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


import definePlugin from "@utils/types";
import { addPreSendListener, MessageObject, removePreSendListener } from "@api/MessageEvents";

export default definePlugin({
    name: "xfix",
    description: "This plugin fixes twitter embeds not showing",
    dependencies: ["MessageEventsAPI"],
    authors: [
        {
            id: 1092691233010368653n,
            name: "Twin1",
        },
    ],

    fixTwitterMsg(msg: MessageObject) {
        if (msg.content.includes("twitter.com")) {
            msg.content = msg.content.replace("twitter.com", "fxtwitter.com");
        } else if (msg.content.includes("x.com")) {
            msg.content = msg.content.replace("x.com", "fixupx.com");
        }

    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.fixTwitterMsg(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});