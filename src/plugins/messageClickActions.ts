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

import { addClickListener, removeClickListener } from "@api/MessageEvents";
import { migratePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { PermissionStore, UserStore } from "@webpack/common";

let isDeletePressed = false;
const keydown = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = true);
const keyup = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = false);

const MANAGE_CHANNELS = 1n << 4n;

migratePluginSettings("MessageClickActions", "MessageQuickActions");

export default definePlugin({
    name: "MessageClickActions",
    description: "Hold Backspace and click to delete, double click to edit",
    authors: [Devs.Ven],
    dependencies: ["MessageEventsAPI"],

    options: {
        enableDeleteOnClick: {
            type: OptionType.BOOLEAN,
            description: "Enable delete on click",
            default: true
        },
        enableDoubleClickToEdit: {
            type: OptionType.BOOLEAN,
            description: "Enable double click to edit",
            default: true
        }
    },

    start() {
        const MessageActions = findByPropsLazy("deleteMessage", "startEditMessage");
        const EditStore = findByPropsLazy("isEditing", "isEditingAny");

        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);

        this.onClick = addClickListener((msg, chan, event) => {
            const isMe = msg.author.id === UserStore.getCurrentUser().id;
            if (!isDeletePressed) {
                if (Vencord.Settings.plugins.MessageClickActions.enableDoubleClickToEdit && (isMe && event.detail >= 2 && !EditStore.isEditing(chan.id, msg.id))) {
                    MessageActions.startEditMessage(chan.id, msg.id, msg.content);
                    event.preventDefault();
                }
            } else if (Vencord.Settings.plugins.MessageClickActions.enableDeleteOnClick && (isMe || PermissionStore.can(MANAGE_CHANNELS, chan))) {
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
