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

import definePlugin, { OptionType } from "../../utils/types";
import { addPreEditListener, addPreSendListener, MessageObject, removePreEditListener, removePreSendListener } from "../../api/MessageEvents";
import { Settings } from "../../Vencord";

const blacklistSeperator = ";";
const urlRegex = new RegExp("^((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?$");

export default definePlugin({
    name: "Remove Chat Buttons",
    description: "Make every first letter of a sentence a capital letter.",
    authors: [
        {
            id: 306692821358739456n,
            name: "Luximus",
        },
    ],
    patches: [],
    capitalize(msg: MessageObject) {
        const sentences = msg.content.split(". ");

        for (let i = 0; i < sentences.length; i++) {
            const firstWord = sentences[i].split(" ")[0];
            const blacklist: string[] = Settings.plugins.Capitalize.blacklist.split(blacklistSeperator);

            // check for cases where there shouldn't be a capital letter
            if (blacklist.includes(firstWord) || urlRegex.test(firstWord)) return;

            sentences[i] = sentences[i][0].toUpperCase() + sentences[i].slice(1, sentences[i].length);
        }

        msg.content = sentences.join(". ");
    },
    start() {
        this.preSend = addPreSendListener((_, msg) => this.capitalize(msg));
        this.preEdit = addPreEditListener((_cid, _mid, msg) => this.capitalize(msg));
    },
    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    },
    options: {
        blacklist: {
            description: `List of words not to capitalize (seperate with a ${blacklistSeperator})`,
            type: OptionType.STRING,
            default: "http;https",
            restartNeeded: true,
        }
    }
});
