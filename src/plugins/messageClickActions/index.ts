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

import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import NoReplyMentionPlugin from "@plugins/noReplyMention";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ApplicationIntegrationType, MessageFlags } from "@vencord/discord-types/enums";
import { findByPropsLazy } from "@webpack";
import { AuthenticationStore, FluxDispatcher, MessageTypeSets, PermissionsBits, PermissionStore, WindowStore } from "@webpack/common";

const MessageActions = findByPropsLazy("deleteMessage", "startEditMessage");
const EditStore = findByPropsLazy("isEditing", "isEditingAny");

let isDeletePressed = false;
const keydown = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = true);
const keyup = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = false);
const focusChanged = () => !WindowStore.isFocused() && (isDeletePressed = false);

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
    requireModifier: {
        type: OptionType.BOOLEAN,
        description: "Only do double click actions when shift/ctrl is held",
        default: false
    }
});

export default definePlugin({
    name: "MessageClickActions",
    description: "Hold Backspace and click to delete, double click to edit/reply",
    authors: [Devs.Ven],

    settings,

    start() {
        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);
        WindowStore.addChangeListener(focusChanged);
    },

    stop() {
        document.removeEventListener("keydown", keydown);
        document.removeEventListener("keyup", keyup);
        WindowStore.removeChangeListener(focusChanged);
    },

    onMessageClick(msg, channel, event) {
        const myId = AuthenticationStore.getId();
        const isMe = msg.author.id === myId;
        const isSelfInvokedUserApp = msg.interactionMetadata?.authorizing_integration_owners[ApplicationIntegrationType.USER_INSTALL] === myId;
        if (!isDeletePressed) {
            if (event.detail < 2) return;
            if (settings.store.requireModifier && !event.ctrlKey && !event.shiftKey) return;
            if (channel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, channel)) return;
            if (msg.deleted === true) return;

            if (isMe) {
                if (!settings.store.enableDoubleClickToEdit || EditStore.isEditing(channel.id, msg.id) || msg.state !== "SENT") return;

                MessageActions.startEditMessage(channel.id, msg.id, msg.content);
                event.preventDefault();
            } else {
                if (!settings.store.enableDoubleClickToReply) return;

                if (!MessageTypeSets.REPLYABLE.has(msg.type) || msg.hasFlag(MessageFlags.EPHEMERAL)) return;

                const isShiftPress = event.shiftKey && !settings.store.requireModifier;
                const shouldMention = isPluginEnabled(NoReplyMentionPlugin.name)
                    ? NoReplyMentionPlugin.shouldMention(msg, isShiftPress)
                    : !isShiftPress;

                FluxDispatcher.dispatch({
                    type: "CREATE_PENDING_REPLY",
                    channel,
                    message: msg,
                    shouldMention,
                    showMentionToggle: channel.guild_id !== null
                });
            }
        } else if (settings.store.enableDeleteOnClick && (isMe || PermissionStore.can(PermissionsBits.MANAGE_MESSAGES, channel) || isSelfInvokedUserApp)) {
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
    },
});
