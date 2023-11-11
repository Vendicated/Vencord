/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, MrDiamond, ant0n, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { MessageStore, UserStore } from "@webpack/common";
import { MessageJSON, UserJSON } from "discord-types/general";

export const settings = definePluginSettings({
    alwaysPingOnReply: {
        type: OptionType.BOOLEAN,
        description: "Always get pinged when someone replies to your messages",
        default: false,
    }
});

export default definePlugin({
    name: "ReplyPingControl",
    description: "Control whether to always or never get pinged on message replies",
    authors: [Devs.ant0n, Devs.MrDiamond],
    settings,

    patches: [
        {
            find: "_channelMessages",
            replacement: {
                match: /receiveMessage\((\i)\)\{/,
                replace: "$&$self.modifyMentions($1);"
            }
        }
    ],

    modifyMentions(message: MessageJSON) {
        const isReplyToCurrentUser = this.isReplyToCurrentUser(message);
        if (settings.store.alwaysPingOnReply && isReplyToCurrentUser) {

            if (!message.mentions.some(mention => mention.id === UserStore.getCurrentUser().id)) {
                message.mentions.push(this.getCurrentUserMention());
            }
        } else if (!settings.store.alwaysPingOnReply && isReplyToCurrentUser) {

            message.mentions = message.mentions.filter(mention => mention.id !== UserStore.getCurrentUser().id);
        }
    },

    isReplyToCurrentUser(message: MessageJSON) {
        if (!message.message_reference) return false;
        const repliedMessage = MessageStore.getMessage(message.channel_id, message.message_reference.message_id);
        return repliedMessage && repliedMessage.author.id === UserStore.getCurrentUser().id;
    },

    getCurrentUserMention() {
        return UserStore.getCurrentUser() as unknown as UserJSON;
    }
});
