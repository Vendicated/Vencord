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
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, MessageStore, ReactDOM, Toasts } from "@webpack/common";
import Message from "discord-types/general/Message";
import { Root } from "react-dom/client";

import ReplyNavigator from "./ReplyNavigator";
import styles from "./styles.css?managed";


export const jumper: any = findByPropsLazy("jumpToMessage");
const FindReplyIcon = () => {
    return <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="18" height="18">
        <path
            d="M 7 3 L 7 11 C 7 11 7 12 6 12 L 5 12 C 4 12 4 12 4.983 13.115 L 8.164 17.036 C 9 18 9 18 9.844 17.018 L 12.991 13.277 C 14 12 14 12 13.006 11.985 L 12 12 C 12 12 11 12 11 11 L 11 3 C 11 2 11 2 10 2 L 8 2 C 7 2 7 2 7 3"/>
    </svg>;
};
let root: Root | null = null;
let element: HTMLDivElement | null = null;
let madeComponent = false;

function findReplies(message: Message) {
    const messages: Array<Message & {
        deleted?: boolean;
    }> = [...MessageStore.getMessages(message.channel_id)?._array ?? []].filter(m => !m.deleted).sort((a, b) => {
        return a.timestamp.toString().localeCompare(b.timestamp.toString());
    }); // Need to deep copy Message array when sorting
    const found: Message[] = [];
    for (const other of messages) {
        if (other.timestamp.toString().localeCompare(message.timestamp.toString()) <= 0) continue;
        if (other.messageReference?.message_id === message.id) {
            found.push(other);
        }
        if (Vencord.Settings.plugins.FindReply.includePings) {
            if (other.content?.includes(`<@${message.author.id}>`)) {
                found.push(other);
            }
        }
        if (Vencord.Settings.plugins.FindReply.includeAuthor) {
            if (messages.find(m => m.id === other.messageReference?.message_id)?.author.id === message.author.id) {
                found.push(other);
            }
        }
    }
    return found;
}

export default definePlugin({
    name: "FindReply",
    description: "Jumps to the earliest reply to a message in a channel (lets you follow past conversations more easily).",
    authors: [Devs.newwares],
    start() {
        enableStyle(styles);
        addButton("vc-findreply", message => {
            if (!message.id) return null;
            const replies = findReplies(message);
            if (Vencord.Settings.plugins.FindReply.hideButtonIfNoReply && !replies.length) return null;
            return {
                label: "Jump to Reply",
                icon: FindReplyIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => {
                    if (replies.length) {
                        const channelId = replies[0].channel_id;
                        const messageId = replies[0].id;
                        jumper.jumpToMessage({
                            channelId,
                            messageId,
                            flash: true,
                            jumpType: "INSTANT"
                        });
                        if (replies.length > 1) {
                            Toasts.show({
                                id: Toasts.genId(),
                                message: "Use the bottom panel to navigate between replies.",
                                type: Toasts.Type.MESSAGE
                            });
                            if (!madeComponent) {
                                madeComponent = true;
                                element = document.createElement("div");
                                document.querySelector("[class^=base_]")!.appendChild(element);
                                root = ReactDOM.createRoot(element);
                            }
                            root!.render(<ReplyNavigator replies={replies}/>);
                        }
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
        root && root.unmount();
        element?.remove();
        disableStyle(styles);
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
        },
        hideButtonIfNoReply: {
            type: OptionType.BOOLEAN,
            description: "Hides the button if there are no replies to the message",
            default: true,
            restartNeeded: true
        }
    }
});

