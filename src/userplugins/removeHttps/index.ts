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

import { MessageObject } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const URL_PROTOCOL_REGEX = /\bhttps?:\/\//gi;

export default definePlugin({
    name: "RemoveHttps",
    description: "Removes http:// and https:// from messages before they are sent or edited",
    authors: [Devs.Ven],
    tags: ["Chat", "Utility"],
    requiresRestart: false,

    onBeforeMessageSend(_, msg) {
        cleanMessage(msg);
    },

    onBeforeMessageEdit(_channelId, _messageId, msg) {
        cleanMessage(msg);
    }
});

function cleanMessage(msg: MessageObject) {
    if (!msg.content) return;

    URL_PROTOCOL_REGEX.lastIndex = 0;
    if (!URL_PROTOCOL_REGEX.test(msg.content)) return;

    URL_PROTOCOL_REGEX.lastIndex = 0;
    msg.content = msg.content.replace(URL_PROTOCOL_REGEX, "");
}
