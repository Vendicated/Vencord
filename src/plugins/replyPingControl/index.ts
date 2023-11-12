/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, Mr Diamond, ant0n and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { MessageStore, UserStore } from "@webpack/common";
import { MessageJSON } from "discord-types/general";

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

    patches: [{
        find: "_channelMessages",
        replacement: {
            match: /receiveMessage\((\i)\)\{/,
            replace: "$&$self.modifyMentions($1);"
        }
    }],

    modifyMentions(message: MessageJSON) {
        const user = UserStore.getCurrentUser();

        if (this.getRepliedMessage(message)?.author.id !== user.id)
            return;

        if (!settings.store.alwaysPingOnReply)
            message.mentions = message.mentions.filter(mention => mention.id !== user.id);
        else if (!message.mentions.some(mention => mention.id === user.id))
            message.mentions.push(user as any);
    },

    getRepliedMessage(message: MessageJSON) {
        const ref = message.message_reference;
        return ref && MessageStore.getMessage(ref.channel_id, ref.message_id);
    },
});
