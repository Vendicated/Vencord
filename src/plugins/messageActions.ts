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

import { addClickListener, removeClickListener } from "../api/MessageEvents";
import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";
import { find, findByProps } from "../webpack";
import { UserStore } from "../webpack/common";

let isDeletePressed = false;
const keydown = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = true);
const keyup = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = false);

export default definePlugin({
    name: "MessageQuickActions",
    description: "Quick Delete, Quick edit",
    authors: [Devs.Ven],
    dependencies: ["MessageEventsAPI"],

    start() {
        const { deleteMessage, startEditMessage } = findByProps("deleteMessage", "startEditMessage");
        const { can } = findByProps("can", "initialize");
        const { MANAGE_MESSAGES } = find(m => typeof m.MANAGE_MESSAGES === "bigint");
        const { isEditing } = findByProps("isEditing", "isEditingAny");

        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);

        this.onClick = addClickListener((msg, chan, event) => {
            const isMe = msg.author.id === UserStore.getCurrentUser().id;
            if (!isDeletePressed) {
                if (isMe && event.detail >= 2 && !isEditing(chan.id, msg.id)) {
                    startEditMessage(chan.id, msg.id, msg.content);
                    event.preventDefault();
                }
            } else if (isMe || can(MANAGE_MESSAGES, chan)) {
                deleteMessage(chan.id, msg.id);
                event.preventDefault();
            }
        });
    },

    stop() {
        removeClickListener(this.onClick);
        document.removeEventListener("keydown", keydown);
        document.removeEventListener("keyup", keyup);
    }
});
