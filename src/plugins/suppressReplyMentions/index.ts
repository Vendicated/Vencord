/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Baldy09
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";
import { Channel, Message } from "discord-types/general/index.js";

export default definePlugin({
    name: "Suppress Reply Mentions",
    description: "Annoyed by unwanted reply pings and mentions?\nThis plugin blocks them so you never get pinged again!\nJust enable the plugin, restart Vencord, and you're all set!",
    authors: [Devs.Baldy09],
    patches: [
        ...[
            '"MessageStore"',
            '"ReadStateStore"'
        ].map(find => ({
            find,
            replacement: [
                {
                    match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                    replace: (_, props) => `${props}.message = $self.processMessage(${props}.message) || ${props}.message;`
                }
            ]
        }))
    ],


    processMessage(message: Message)
    {
        if (message.state === "SENDING") return;

        var currentUser = UserStore.getCurrentUser()
        var currentUserPingTag = `<@${currentUser.id}>`
        if (message.content.includes(currentUserPingTag)) return; // if message is a `@` ping return


        var mentionIndex = message.mentions.findIndex(e => e.id === currentUser.id);
        if (mentionIndex == -1) return; // if no reply ping found return

        message.mentions.splice(mentionIndex, 1); // remove the mention


        console.log(`[SuppressReplyMentions] Blocked reply ping from: ${message.author.username}`)
        return message; // return the message to discord for processing
    }

});
