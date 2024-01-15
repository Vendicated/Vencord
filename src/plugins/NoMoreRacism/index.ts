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
    .replace(/\b(digger|nigger)\b/gi, function(match) {
        return match.toLowerCase() === 'digger' ? 'nigger' : 'digger';
    })
    .replace(/\b(digga|nigga)\b/gi, function(match) {
        return match.toLowerCase() === 'digga' ? 'nigga' : 'digga';
    });
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
