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

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

/**
 * Matches TikTok URLs:
 * https://www.tiktok.com/@{username}/video/{videoId}
 * https://www.tiktok.com/t/{shareId}
 * https://vm.tiktok.com/{shareId}/
 */
const TIKTOK_PATTERN = /https?:\/\/(?:(?:(?:www\.))tiktok\.com\/(@[a-z\d]+\/video\/\d+|t\/[a-z\d]+)|(?:vm\.tiktok\.com\/([a-z\d]+)))/gi;

export default definePlugin({
    name: "TikTxk",
    description: "Uses TikTxk to properly embed TikTok videos",
    authors: [Devs.MyNameIsJeff],
    dependencies: ["MessageEventsAPI"],

    replaceLinks(_channelId, message, _extra) {
        message.content = message.content.replace(TIKTOK_PATTERN, "https://tiktxk.com/$1$2");
    },

    start() {
        addPreSendListener(this.replaceLinks);
    },

    stop() {
        removePreSendListener(this.replaceLinks);
    }
});
