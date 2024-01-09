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
import { Devs } from "@utils/constants";
import {
    addPreEditListener,
    addPreSendListener,
    MessageObject,
    removePreEditListener,
    removePreSendListener
} from "@api/MessageEvents";

export default definePlugin({
    name: "FixTwitterEmbeds",
    description: "Fixes twitter embeds (link preview) by replacing twitter/x in the url to fxtwitter, powered by fxtwitter.com",
    authors: [
        Devs.Arian
    ],
    dependencies: ["MessageEventsAPI"],
    onSend(msg: MessageObject) {
        // Only run on messages that contain twitter/x links
        if (msg.content.match("http(?:s)?:\/\/(?:www\.)?(twitter|x)\.com\/([a-zA-Z0-9_]+)\/status\/.*")) {
            // replace with fxtwitter url
            msg.content = msg.content.replace(
                /(twitter|x)\.com/, "fxtwitter.com"
            );
        }
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.onSend(msg));
        this.preEdit = addPreEditListener((_cid, _mid, msg) =>
            this.onSend(msg)
        );
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    },
});