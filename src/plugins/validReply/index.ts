/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { MessageJSON } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { ChannelRecord, MessageRecord, UserRecord } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { FluxDispatcher, RestAPI } from "@webpack/common";

const enum ReferencedMessageState {
    LOADED = 0,
    NOT_LOADED = 1,
    DELETED = 2,
}

interface Reply {
    baseAuthor: UserRecord,
    baseMessage: MessageRecord;
    channel: ChannelRecord;
    referencedMessage: { state: ReferencedMessageState; };
    compact: boolean;
    isReplyAuthorBlocked: boolean;
}

const fetching = new Map<string, string>();

let ReferencedMessageCache: any;

const createMessageRecord: (apiMessage: MessageJSON) => MessageRecord
    = findByCodeLazy(".createFromServer(", ".isBlockedForMessage", "messageReference:");

export default definePlugin({
    name: "ValidReply",
    description: 'Fixes "Message could not be loaded" upon hovering over the reply',
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
                replace: "$&;$self.setReferencedMessageCache(this);"
            }
        }
    ],

    setReferencedMessageCache(obj: any) {
        ReferencedMessageCache = obj;
    },

    async fetchReply(reply: Reply) {
        const { channel_id: channelId, message_id: messageId } = reply.baseMessage.messageReference!;

        if (fetching.has(messageId!)) return;

        fetching.set(messageId!, channelId);

        try {
            const res = await RestAPI.get({
                url: `/channels/${channelId}/messages`,
                query: {
                    limit: 1,
                    around: messageId
                },
                retries: 2
            });
            const reply: MessageJSON | undefined = res?.body?.[0];
            if (!reply) return;

            if (reply.id !== messageId) {
                ReferencedMessageCache.set(channelId, messageId, {
                    state: ReferencedMessageState.DELETED
                });

                FluxDispatcher.dispatch({
                    type: "MESSAGE_DELETE",
                    channelId: channelId,
                    message: messageId
                });
            } else {
                ReferencedMessageCache.set(reply.channel_id, reply.id, {
                    state: ReferencedMessageState.LOADED,
                    message: createMessageRecord(reply)
                });

                FluxDispatcher.dispatch({
                    type: "MESSAGE_UPDATE",
                    message: reply
                });
            }
        } catch {
        } finally {
            fetching.delete(messageId!);
        }
    }
});
