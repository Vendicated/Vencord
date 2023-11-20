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
import { UserStore, FluxDispatcher } from "@webpack/common";
import { Message, User } from "discord-types/general";

import settings from "./settings";

interface IMessage {
    referenced_message?: Message;
    mentions: User[];
    flags: number;
}

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: IMessage;
}

export default definePlugin({
    name: "RepliesAlwaysMention",
    authors: [Devs.HAHALOSAH],
    description: "Always receive pings when someone replies to your messages",

    settings,

    interceptor({ optimistic, type, message }: IMessageCreate) {
        if (optimistic || type !== "MESSAGE_CREATE") return;
        if (!message.referenced_message) return;
        var currentUser = UserStore.getCurrentUser();
        if (message.referenced_message.author.id == currentUser.id) {
            for (const mention of message.mentions) {
                if (mention.id == currentUser.id) {
                    return;
                }
            }
            if (settings.store.silent) {
                message.flags |= 1 << 12;
            }
            message.mentions.push(currentUser);
        }
    },

    start() {
        (FluxDispatcher as any)._interceptors.push(this.interceptor);
    },

    stop() {
        (FluxDispatcher as any)._interceptors = (FluxDispatcher as any)._interceptors.filter(i => i !== this.interceptor);
    }
});

