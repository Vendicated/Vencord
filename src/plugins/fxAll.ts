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

import { addPreSendListener, MessageObject, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const regexList = [
    {
        test: /https?:\/\/twitter\.com(?=\/\w+?\/status\/)/g,
        replace: "https://fxtwitter.com"
    },
    {
        test: /https?:\/\/(?:www|vm)\.tiktok\.com/g,
        replace: "https://vm.tiktxk.com"
    },
    {
        test: /https?:\/\/(?:www\.)?instagram\.com(?=\/p\/)/g,
        replace: "https://ddinstagram.com"
    },
    {
        test: /https?:\/\/(?:www\.)?reddit\.com(?=\/r\/\w+?\/comments\/)/g,
        replace: "https://rxyddit.com"
    }
];


export default definePlugin({
    name: "FxAll",
    description: "Replaces Instagram, TikTok, Reddit and Twitter links to proxy websites (e.g. fxtwitter, ddinstagram) to display better embeds.",
    authors: [Devs.eggsy],
    dependencies: ["MessageEventsAPI"],

    addPrefix(msg: MessageObject) {
        let newString = msg.content;

        for (const item of regexList) {
            newString = newString.replace(item.test, item.replace);
        }

        msg.content = newString;
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.addPrefix(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
