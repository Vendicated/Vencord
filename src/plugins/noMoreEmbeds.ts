/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 castdrian
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

const regex = /https?:\/\/[^\s]+/g;

export default definePlugin({
    name: "NoMoreEmbeds",
    description: "Wraps all urls in chevrons to prevent embeds",
    authors: [Devs.castdrian],
    dependencies: ["MessageEventsAPI"],

    addPrefix(msg: MessageObject) {
        msg.content = msg.content.replace(regex, "<$&>");
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.addPrefix(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
