/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher, RestAPI } from "@webpack/common";
import { Message, User } from "discord-types/general";
import { Channel } from "discord-types/general/index.js";
interface Reply {
    baseAuthor: User,
    baseMessage: Message
    channel: Channel
    referencedMessage: { state: number } // 0 = normal, 1 = couldn't load, 2 = deleted
    compact: boolean
    isReplyAuthorBlocked: boolean
}
const fetching = new Map<string,string>();
let ReplyStore:any;
export default definePlugin({
    name: "ValidReply",
    description: "Fixes \"Message could not be loaded\" upon hovering over the reply",
    authors: [Devs.newwares],
    patches: [
        {
            find: "Messages.REPLY_QUOTE_MESSAGE_NOT_LOADED",
            replacement: {
                match: /Messages\.REPLY_QUOTE_MESSAGE_NOT_LOADED/,
                replace: "$&,onMouseEnter:()=>$self.fetchReply(arguments[0])"
            }
        },
        {
            find: "ReferencedMessageStore",
            replacement: {
                match: /constructor\(\)\{\i\(this,"_channelCaches",new Map\)/,
                replace: "$&;$self.setReplyStore(this);"
            }
        }
    ],
    setReplyStore(store: any) {
        ReplyStore=store;
    },
    fetchReply(reply:Reply) {
        const { channel_id: channel, message_id: message } = reply.baseMessage.messageReference!;
        if (fetching.has(message)) {
            return;
        }
        fetching.set(message, channel);
        RestAPI.get({ url: `/channels/${channel}/messages`,
            query: {
                limit: 1,
                around: message
            },
            retries: 2
        }).then(res => {
            const reply:Message|undefined = res?.body?.[0];
            if (!reply) return;
            ReplyStore.updateExistingMessageIfCached(reply);
            FluxDispatcher.dispatch({
                type: "MESSAGE_UPDATE",
                message: reply
            });
        }).finally(() => {
            fetching.delete(message);
        });
    }
});
