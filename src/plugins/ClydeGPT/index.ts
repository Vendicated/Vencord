/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated, Samu and contributors
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
import { FluxDispatcher,UserStore } from "@webpack/common";

const runGPT = async msg => {
    const { message } = msg;

    if (!message.content.includes("@Clyde")) {
        return;
    }

    if (message.author.id === UserStore.getCurrentUser().id && !msg?.sendMessageOptions?.nonce) {
        return;
    }

    if (message.author?.bot) {
        return;
    }

    FluxDispatcher.dispatch({
        type: "TYPING_START",
        channelId: message.channel_id,
        userId: "1081004946872352958",
    });

    const rawResponse = await fetch("https://ai.techfun.me/gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: message.content })
    });

    const response = await rawResponse.json();

    if (!response.success) {
        response.result = "Failed to obtain AI result.";
    }

    FluxDispatcher.dispatch({
        type: "MESSAGE_CREATE",
        channelId: message.channel_id,
        message: {
            attachments: [],
            author: {
                id: "1081004946872352958",
                username: "clyde",
                avatar: "a_6170487d32fdfe9f988720ad80e6ab8c",
                discriminator: "0000",
                public_flags: 0,
                premium_type: 2,
                flags: 0,
                bot: true,
                banner: null,
                accent_color: null,
                global_name: "Clyde",
                avatar_decoration_data: null,
                banner_color: null
            },
            channel_id: message.channel_id,
            components: [],
            content: response.result,
            edited_timestamp: null,
            embeds: [],
            flags: 0,
            id: (BigInt(Date.now() - 1420070400000) << 22n).toString(),
            mention_everyone: false,
            mention_roles: [],
            mentions: [],
            message_reference: {
                channel_id: message.channel_id,
                message_id: message.id
            },
            nonce: (BigInt(Date.now() - 1420070400000) << 22n).toString(),
            pinned: false,
            referenced_message: message,
            timestamp: new Date(),
            tts: false,
            type: 19
        },
        optimistic: false,
        isPushNotification: false
    });
};

export default definePlugin({
    name: "ClydeGPT",
    description: "The ultimate return of Clyde!",
    authors: [Devs.TechFun, Devs.Airbus],
    dependencies: ["MessageEventsAPI"],
    start: () => {
        FluxDispatcher.subscribe("MESSAGE_CREATE", runGPT);
    },
    stop: () => {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", runGPT);
    }
});
