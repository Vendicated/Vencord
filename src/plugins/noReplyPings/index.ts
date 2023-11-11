/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { MessageStore, UserStore } from "@webpack/common";

export default definePlugin({
    name: "NoReplyPings",
    description: "Disables getting pinged by replies, even if the sender didn't turn it off",
    authors: [Devs.MrDiamond],
    patches: [
        {
            find: "_channelMessages",
            replacement: {
                match: /receiveMessage\((\i)\)\{/,
                replace: "$&if($self.isReplyMention($1))$1.mentions=[];"
            }
        }
    ],

    // I would type this as Message but for some reason there's two types discord uses, and this happens to be the one discord-types doesn't have
    isReplyMention(e: any) {
        if (!e.message_reference) return false;

        const repliedMessage = MessageStore.getMessage(e.channel_id, e.message_reference.message_id);
        if (!repliedMessage) return false;

        return repliedMessage.author.id === UserStore.getCurrentUser().id;
    }
});
