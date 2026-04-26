/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, MrDiamond, ant0n, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { MessageJSON } from "@vencord/discord-types";
import { MessageStore, UserStore } from "@webpack/common";

export const settings = definePluginSettings({
    alwaysPingOnReply: {
        type: OptionType.BOOLEAN,
        description: "Always get pinged when someone replies to your messages",
        default: false,
    },
    replyPingWhitelist: {
        type: OptionType.STRING,
        description: "Comma-separated list of User IDs to always receive reply pings from",
        default: "",
        disabled: () => settings.store.alwaysPingOnReply,
    },
    replyPingBlacklist: {
        type: OptionType.STRING,
        description: "Comma-separated list of User IDs to never receive reply pings from",
        default: "",
    }
});

export default definePlugin({
    name: "ReplyPingControl",
    description: "Control whether to always or never get pinged on message replies, with whitelist and blacklist features",
    tags: ["Chat", "Notifications"],
    authors: [Devs.ant0n, EquicordDevs.MrDiamond, EquicordDevs.keircn],
    settings,

    patches: [{
        find: "_channelMessages",
        replacement: {
            match: /receiveMessage\((\i)\)\{/,
            replace: "$&$self.modifyMentions($1);"
        }
    }],

    modifyMentions(message: MessageJSON) {
        const user = UserStore.getCurrentUser();
        if (message.author.id === user.id) return;

        const repliedMessage = this.getRepliedMessage(message);
        if (!repliedMessage || repliedMessage.author.id !== user.id) return;

        const { replyPingBlacklist, replyPingWhitelist, alwaysPingOnReply } = settings.plain;
        const authorId = message.author.id;

        if (replyPingBlacklist && replyPingBlacklist.split(",").some(id => id.trim() === authorId)) {
            message.mentions = message.mentions.filter(mention => mention.id !== user.id);
            return;
        }

        const isWhitelisted = replyPingWhitelist && replyPingWhitelist.split(",").some(id => id.trim() === authorId);

        if (isWhitelisted || alwaysPingOnReply) {
            if (!message.mentions.some(mention => mention.id === user.id)) {
                message.mentions.push(user as any);
            }
        } else {
            message.mentions = message.mentions.filter(mention => mention.id !== user.id);
        }
    },

    getRepliedMessage(message: MessageJSON) {
        const ref = message.message_reference;
        return ref && MessageStore.getMessage(ref.channel_id, ref.message_id);
    },
});
