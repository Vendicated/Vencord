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
import definePlugin, { OptionType } from "@utils/types";
import { User } from "discord-types/general";

// temp fix for Message type until global fix is made
class Message {
    activity: unknown;
    application: unknown;
    applicationId: string | unknown;
    author!: User;
    blocked: boolean | undefined;
    bot: boolean | undefined;
    channel_id!: string;
    /* not fully typed: */
    colorString: unknown;
    content: string | undefined;
    customRenderedContent: unknown;
    id!: string;
    interaction: {
        id: string;
        name: string;
        type: number;
        user: User;
    }[] | undefined;
    messageReference: {
        guild_id?: string;
        channel_id: string;
        message_id: string;
    } | undefined;
    nick: unknown; // probably a string
    nonce: string | undefined;
    webhookId: string | undefined;
    webhook_id: string | undefined;
    type: number | undefined;
}



export default definePlugin({
    name: "HideWebhooks",
    description: "Hides all webhook messages. Does not hide normal bot messages.",
    authors: [Devs.xyz9021007],

    patches: [],
    options: {
        source: {
            description: "Whitelisted webhook IDs, separated by commas, no spaces.",
            type: OptionType.STRING,
            default: "",
            restartNeeded: true,
        }
    },

    flux: {
        async MESSAGE_CREATE({ message, channelId }) {

            blockWebhooks(message, channelId);
        },
        async LOAD_MESSAGES_SUCCESS({ messages, channelId }: { messages: Message[]; channelId: string; }) {

            for (var message of messages) {
                blockWebhooks(message, channelId);
            }
        },
        async LOAD_MESSAGES_SUCCESS_CACHED({ messages, channelId }: { messages: Message[]; channelId: string; }) {

            for (var message of messages) {
                blockWebhooks(message, channelId);
            }
        },
        async CHANNEL_SELECT({ channelId }: { channelId: string; }) {
            console.log("CHANNEL_SELECT");

            // TODO fetch messages by channel id and hide webhooks
        }
    },

});


async function blockWebhooks(message, channelId) {
    function delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    var whitelist = Vencord.Settings.plugins.HideWebhooks.source.split(",");


    if (message.author.bot && message.webhook_id !== null && message.webhook_id !== undefined && !whitelist.includes(message.webhook_id) && message.type === 0) {

        console.log("WID - " + message.webhook_id);

        await delay(50); // Rate limiting, so that the client does not autoscroll too fast.
        const messageElement = document.querySelector(`div[data-list-item-id="chat-messages___chat-messages-${channelId}-${message.id}"]`);
        if (messageElement) {
            messageElement.setAttribute("style", "display: none !important;");
        } else {
            const messageContentElement = document.querySelector(`div[id="message-content-${message.id}"]`);
            if (messageContentElement) {
                messageContentElement.setAttribute("style", "display: none !important;");

            }
        }
    }
}
