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
import { migratePluginSettings } from "../api/settings";
import { Devs } from "../utils/constants";
import { lazyWebpack } from "../utils/misc";
import definePlugin from "../utils/types";
import { filters } from "../webpack";
import { UserStore } from "../webpack/common";

let isDeletePressed = false;
const keydown = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = true);
const keyup = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = false);

migratePluginSettings("MessageClickActions", "MessageQuickActions");

export default definePlugin({
    name: "MessageClickActions",
    description: "Hold Delete and click to delete, double click to edit",
    authors: [Devs.Ven],
    dependencies: ["MessageEventsAPI"],

    start() {
        const MessageActions = lazyWebpack(filters.byProps("deleteMessage", "startEditMessage"));
        const PermissionStore = lazyWebpack(filters.byProps("can", "initialize"));
        const Permissions = lazyWebpack(m => typeof m.MANAGE_MESSAGES === "bigint");
        const EditStore = lazyWebpack(filters.byProps("isEditing", "isEditingAny"));

        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);

        this.onClick = addClickListener((msg, chan, event) => {
            const isMe = msg.author.id === UserStore.getCurrentUser().id;
            if (!isDeletePressed) {
                if (isMe && event.detail >= 2 && !EditStore.isEditing(chan.id, msg.id)) {
                    MessageActions.startEditMessage(chan.id, msg.id, msg.content);
                    event.preventDefault();
                }
            } else if (isMe || PermissionStore.can(Permissions.MANAGE_MESSAGES, chan)) {
                MessageActions.deleteMessage(chan.id, msg.id);
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
