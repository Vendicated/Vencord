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

import { sendBotMessage } from "@api/Commands";
import { UserStore } from "@webpack/common";
import { FluxDispatcher } from "@webpack/common";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ClydeGPT",
    description: "The ultimate return of Clyde!",
    authors: [Devs.TechFun],
    dependencies: ["MessageEventsAPI"],
    start: () => {
        FluxDispatcher.subscribe("MESSAGE_CREATE", async msg => {
            const message = msg.message;
            
            if (!message.content.includes("@Clyde")) {
                return;
            }

            if (message.author.id == UserStore.getCurrentUser().id && !msg.sendMessageOptions.nonce) {
                return;
            }

            const rawResponse = await fetch('https://ai.techfun.me/gpt', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({q: message.content})
            });

            const response = await rawResponse.json();

            if (response.success) {
                sendBotMessage(message.channel_id, {
                    content: response.result,
                });
            } else {
                sendBotMessage(message.channel_id, {
                    content: "Failed to obtain AI result.",
                });
            }
          
        });
    }
});
