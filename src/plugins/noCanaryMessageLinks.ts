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

import { addPreSendListener, MessageObject, removePreSendListener } from "../api/MessageEvents";
import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "NoCanaryMessageLinks",
    description: "Removes the canary and ptb prefix from message links",
    authors: [Devs.Samu],
    dependencies: ["MessageEventsAPI"],

    removeBetas(msg: MessageObject) {
        msg.content = msg.content.replace(/(?<=https:\/\/)(canary.|ptb.)(?=discord(?:app)?.com\/channels\/(?:\d{17,20}|@me)\/\d{17,20}\/\d{17,20})/g, ""); // Ven W
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.removeBetas(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
