/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Channel, Message } from "@vencord/discord-types";

// Taken From Signature :)
const settings = definePluginSettings({
    forwardPreface: {
        description: "What should forwarded from be prefaced with",
        type: OptionType.SELECT,
        options: [
            { label: ">", value: ">", default: true },
            { label: "-#", value: "-#" }
        ]
    }
});

export default definePlugin({
    name: "ForwardAnywhere",
    description: "If a forward fails send it as a normal message also allows nsfw forwards",
    authors: [Devs.thororen],
    settings,
    patches: [
        {
            find: "#{intl::MESSAGE_FORWARDING_NSFW_NOT_ALLOWED}",
            replacement: {
                match: /(\{if\().{0,50}(\)return.{0,25}#{intl::MESSAGE_FORWARDING_NSFW_NOT_ALLOWED})/,
                replace: "$1false$2",
            }
        },
        {
            find: "#{intl::MESSAGE_ACTION_FORWARD_TO}",
            replacement: {
                match: /(?<=let (\i)=.{0,25}rejected.{0,25}\);)(?=.{0,25}message:(\i))/,
                replace: "if ($1) return $self.sendForward($1,$2);",
            }
        },
    ],

    sendForward(channels: Channel[], message: Message) {
        const chunkSize = 5;
        channels.forEach(c => {
            if (message.attachments.length) {
                for (let i = 0; i < message.attachments.length; i += chunkSize) {
                    const group = message.attachments.slice(i, i + chunkSize);
                    const text = `${message.content}\nAttachments:\n${group.map(a => a.url).join("\n")}\n${settings.store.forwardPreface} Forwarded from <#${message.channel_id}>`;
                    sendMessage(c.id, { content: text });
                }
            } else {
                sendMessage(c.id, {
                    content: `${message.content}\n${settings.store.forwardPreface} Forwarded from <#${message.channel_id}>`
                });
            }
        });
    }
});
