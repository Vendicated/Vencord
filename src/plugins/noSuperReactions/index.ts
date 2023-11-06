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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { MessageStore } from "@webpack/common";

type Emoji = {
    id: string | null;
    name: string;
};

type MessageReaction = {
    emoji: Emoji;
    count: number;
    count_details: {
        burst: number;
        normal: number;
    };
    burst_colors: string[];
    me_burst: boolean;
    burst_me: boolean;
    me: boolean;
    burst_count: number;
    burst: boolean;
};

type Message = {
    id: string;
    reactions: MessageReaction[];
};

type LoadMessagesSuccess = {
    type: "LOAD_MESSAGES_SUCCESS";
    channelId: string;
    messages: Message[];
};

type MessageReactionBase = {
    channelId: string;
    messageId: string;
};

function transformMessageReaction(reaction: MessageReaction) {
    reaction.me = reaction.me || reaction.burst_me;
    reaction.count = reaction.count_details.normal + reaction.count_details.burst;
    reaction.count_details.normal = reaction.count;
    reaction.burst = false;
    reaction.burst_colors = [];
    reaction.burst_count = 0;
    reaction.burst_me = false;
    reaction.count_details.burst = 0;
    reaction.me_burst = false;
}

function handleMessageReactionEvent(event: MessageReactionBase) {
    const storedMessage = MessageStore.getMessage(event.channelId, event.messageId);
    if (!storedMessage || !storedMessage.reactions || !storedMessage.reactions.length) return;
    for (const reaction of storedMessage.reactions) {
        // @ts-expect-error discord-types is outdated
        transformMessageReaction(reaction);
    }
}

export default definePlugin({
    name: "NoSuperReactions",
    authors: [Devs.Ven],
    description: "Treats super reactions as normal reactions.",

    flux: {
        LOAD_MESSAGES_SUCCESS(event: LoadMessagesSuccess) {
            for (const message of event.messages) {
                if (!message.reactions || !message.reactions.length) continue;
                for (const reaction of message.reactions) transformMessageReaction(reaction);
                const storedMessage = MessageStore.getMessage(event.channelId, message.id);
                // @ts-expect-error discord-types is outdated
                if (storedMessage) storedMessage.reactions = message.reactions;
            }
        },

        MESSAGE_REACTION_ADD: handleMessageReactionEvent,
        MESSAGE_REACTION_REMOVE: handleMessageReactionEvent,
        MESSAGE_REACTION_REMOVE_ALL: handleMessageReactionEvent,
        MESSAGE_REACTION_REMOVE_EMOJI: handleMessageReactionEvent,
    }
});
