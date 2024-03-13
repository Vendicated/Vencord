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

import { addButton, removeButton } from "@api/MessagePopover";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, MessageStore, Toasts } from "@webpack/common";
import Message from "discord-types/general/Message";


const jumper = findByPropsLazy("jumpToMessage");
const FindReplyIcon = () => {
    return <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="18" height="18">
        <path d="M 7 2 L 7 12 L 4 12 L 9 18 L 14 12 L 11 12 L 11 2" />
    </svg>;
};

export default definePlugin({
    name: "FindReply",
    description: "Jumps to the earliest reply to a message in a channel (lets you follow past conversations more easily).",
    authors: [Devs.newwares],
    start() {
        addButton("vc-findreply", message => {
            if (!message.id) return null;
            return {
                label: "Jump to Reply",
                icon: FindReplyIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => {
                    const messages: Array<Message & { deleted?: boolean; }> = [...MessageStore.getMessages(message.channel_id)?._array ?? []].filter(m => !m.deleted).sort((a, b) => {
                        return a.timestamp.toString().localeCompare(b.timestamp.toString());
                    }); // Need to deep copy Message array when sorting
                    console.log(messages);
                    let reply: Message | null = null;
                    for (const other of messages) {
                        if (other.timestamp.toString().localeCompare(message.timestamp.toString()) <= 0) continue;
                        if (other.messageReference?.message_id === message.id) {
                            reply = other;
                            break;
                        }
                        if (Vencord.Settings.plugins.FindReply.includePings) {
                            if (other.content?.includes(`<@${message.author.id}>`)) {
                                reply = other;
                                break;
                            }
                        }
                        if (Vencord.Settings.plugins.FindReply.includeAuthor) {
                            if (messages.find(m => m.id === other.messageReference?.message_id)?.author.id === message.author.id) {
                                reply = other;
                                break;
                            }
                        }

                    }
                    if (reply) {
                        const channelId = reply.channel_id;
                        const messageId = reply.id;
                        jumper.jumpToMessage({
                            channelId,
                            messageId,
                            flash: true,
                            jumpType: "INSTANT"
                        });
                    } else {
                        Toasts.show({
                            id: Toasts.genId(),
                            message: "Couldn't find a reply.",
                            type: Toasts.Type.FAILURE
                        });
                    }
                }
            };
        });
    },
    stop() {
        removeButton("vc-findreply");
    },
    options: {
        includePings: {
            type: OptionType.BOOLEAN,
            description: "Will also search for messages that @ the author directly",
            default: false,
            restartNeeded: false
        },
        includeAuthor: {
            type: OptionType.BOOLEAN,
            description: "Will also search for messages that reply to the author in general, not just that exact message",
            default: false,
            restartNeeded: false
        }
    }
});
