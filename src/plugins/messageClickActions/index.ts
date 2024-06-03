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

import { sendBotMessage } from "@api/Commands";
import { addClickListener, removeClickListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher, PermissionsBits, PermissionStore, UserStore } from "@webpack/common";

const MessageActions = findByPropsLazy("deleteMessage", "startEditMessage");
const EditStore = findByPropsLazy("isEditing", "isEditingAny");
const pinModule = findByPropsLazy("pinMessage", "unpinMessage");

let isDeletePressed = false;
const keydown = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = true);
const keyup = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = false);

const settings = definePluginSettings({
    enableDeleteOnClick: {
        type: OptionType.BOOLEAN,
        description: "Enable delete on click while holding backspace",
        default: true
    },
    enableDoubleClickToEdit: {
        type: OptionType.BOOLEAN,
        description: "Enable double click to edit",
        default: true
    },
    enableDoubleClickToReply: {
        type: OptionType.BOOLEAN,
        description: "Enable double click to reply",
        default: true
    },
    enableCtrlShiftClickToPinUnpin: {
        type: OptionType.BOOLEAN,
        description: "Enable Ctrl+Shift click to pin/unpin messages",
        default: true
    },
    requireModifier: {
        type: OptionType.BOOLEAN,
        description: "Only do double click actions when shift/ctrl is held",
        default: false
    },
    sendUnpinNotification: {
        type: OptionType.BOOLEAN,
        description: "Send a bot message when a message is unpinned",
        default: false
    }
});

async function pinMessage(channel: any, message: any): Promise<void> {
    if (!pinModule) return;
    await pinModule.pinMessage(channel, message.id);
}

async function unpinMessage(channel: any, message: any): Promise<void> {
    if (!pinModule) return;
    try {
        await pinModule.unpinMessage(channel, message.id);
        if (settings.store.sendUnpinNotification) {
            sendBotMessage(channel.id, {
                content: "Successfully unpinned the message.",
            });
        }
    } catch (error: any) {
        if (settings.store.sendUnpinNotification) {
            sendBotMessage(channel.id, {
                content: "Failed to unpin the message :(",
            });
        }
    }
}

export default definePlugin({
    name: "MessageClickActions",
    description: "Hold Backspace and click to delete, double click to edit/reply, ctrl+shift click to pin/unpin",
    authors: [Devs.Ven, Devs.Prism],
    dependencies: ["MessageEventsAPI"],
    settings,

    start() {
        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);

        this.onClick = addClickListener((msg: any, channel: any, event: MouseEvent) => {
            const isMe = msg.author.id === UserStore.getCurrentUser().id;

            if (settings.store.enableCtrlShiftClickToPinUnpin && event.ctrlKey && event.shiftKey) {
                if (msg.pinned) unpinMessage(channel, msg);
                else pinMessage(channel, msg);
                event.preventDefault();
            }
            else if (!isDeletePressed) {
                if (event.detail < 2) return;
                if (settings.store.requireModifier && !event.ctrlKey && !event.shiftKey) return;
                if (channel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, channel)) return;
                if (msg.deleted === true) return;

                if (isMe) {
                    if (!settings.store.enableDoubleClickToEdit || EditStore.isEditing(channel.id, msg.id)) return;
                    MessageActions.startEditMessage(channel.id, msg.id, msg.content);
                    event.preventDefault();
                } else {
                    if (!settings.store.enableDoubleClickToReply) return;
                    const EPHEMERAL = 64;
                    if (msg.hasFlag(EPHEMERAL)) return;
                    const isShiftPress = event.shiftKey && !settings.store.requireModifier;
                    const NoReplyMention = Vencord.Plugins.plugins.NoReplyMention as any as typeof import("../noReplyMention").default;
                    const shouldMention = Vencord.Plugins.isPluginEnabled("NoReplyMention")
                        ? NoReplyMention.shouldMention(msg, isShiftPress)
                        : !isShiftPress;

                    FluxDispatcher.dispatch({
                        type: "CREATE_PENDING_REPLY",
                        channel,
                        message: msg,
                        shouldMention,
                        showMentionToggle: channel.guild_id !== null
                    });
                }
            } else if (settings.store.enableDeleteOnClick && (isMe || PermissionStore.can(PermissionsBits.MANAGE_MESSAGES, channel))) {
                if (msg.deleted) {
                    FluxDispatcher.dispatch({
                        type: "MESSAGE_DELETE",
                        channelId: channel.id,
                        id: msg.id,
                        mlDeleted: true
                    });
                } else {
                    MessageActions.deleteMessage(channel.id, msg.id);
                }
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
