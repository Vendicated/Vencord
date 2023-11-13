/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, MrDiamond, ant0n, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { MessageStore, showToast, UserStore } from "@webpack/common";
import { MessageJSON } from "discord-types/general";

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
    }
});

export default definePlugin({
    name: "ReplyPingControl",
    description: "Control whether to always or never get pinged on message replies, with a whitelist feature",
    authors: [Devs.ant0n, Devs.MrDiamond],
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
        if (message.author.id === user.id)
            return;

        const repliedMessage = this.getRepliedMessage(message);
        if (!repliedMessage || repliedMessage.author.id !== user.id)
            return;

        const whitelist = parseWhitelist(settings.store.replyPingWhitelist);
        const isWhitelisted = whitelist.includes(message.author.id);

        if (isWhitelisted || settings.store.alwaysPingOnReply) {
            if (!message.mentions.some(mention => mention.id === user.id))
                message.mentions.push(user as any);
        } else {
            message.mentions = message.mentions.filter(mention => mention.id !== user.id);
        }
    },

    getRepliedMessage(message: MessageJSON) {
        const ref = message.message_reference;
        return ref && MessageStore.getMessage(ref.channel_id, ref.message_id);
    },
});

function validateWhitelist(value: string) {
    const whitelist = parseWhitelist(value);
    if (whitelist.some(id => !isValidUserId(id))) {
        showToast("Invalid User ID: One or more User IDs in the whitelist are invalid. Please check your input.");
        return false;
    }
    showToast("Whitelist Updated: Reply ping whitelist has been successfully updated.");
    return true;
}


function parseWhitelist(value: string) {
    return value.split(",")
        .map(id => id.trim())
        .filter(id => id !== "");
}

function isValidUserId(id: string) {
    return /^\d+$/.test(id);
}
