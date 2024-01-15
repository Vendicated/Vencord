/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated, Samu and contributors
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

import { UserStore } from "@webpack/common";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const change = async (_, message) => {
    if (!message.content) return;
    message.content = message.content
    .replace(/\b([dn]iggers?)\b/gi, function(match) {
        return match.replace(/./g, function(char, index) {
          if (match[index] == "d") return "n"
          if (match[index] == "D") return "N"
          if (match[index] == "n") return "d"
          if (match[index] == "N") return "D"
          return match[index];
        });
    })
    .replace(/\b([dn]iggas?)\b/gi, function(match) {
        return match.replace(/./g, function(char, index) {
            if (match[index] == "d") return "n"
            if (match[index] == "D") return "N"
            if (match[index] == "n") return "d"
            if (match[index] == "N") return "D"
            return match[index];
        });
    })
}

export default definePlugin({
    name: "NoMoreRacism",
    description: "Helps you no longer be a racist",
    authors: [Devs.TechFun],
    dependencies: ["MessageEventsAPI"],
    start: () => {
        addPreSendListener(change);
    },
    stop: () => {
        removePreSendListener(change);
    }
});
