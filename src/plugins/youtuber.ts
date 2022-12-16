/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 exhq
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
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher, SelectedChannelStore } from "@webpack/common";
import { Message } from "discord-types/general";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

async function youtuberify(link: string): Promise<string> {
    return await fetch(`https://youtuber.exhq.workers.dev/${link}`).then(it =>
        it.text()
    );
}

const getSubString = (s: string) => {
    const regex = /https:\/\/open.spotify.com\/track\/[a-zA-Z0-9]+/g;
    const matches = regex.exec(s);
    if (matches !== null) {
        return matches[0];
    } else {
        return "";
    }
};

export default definePlugin({
    name: "youtuber",
    authors: [Devs.echo],
    description: "shows you the corresponding youtube link of a spotify track",

    async onMessage(e: IMessageCreate) {
        if (e.optimistic || e.type !== "MESSAGE_CREATE") return;
        if (e.message.state === "SENDING") return;
        if (e.message.author?.bot) return;
        if (!e.message.content) return;
        if (e.channelId !== SelectedChannelStore.getChannelId()) return;

        if (e.message.content.toLowerCase().includes("open.spotify.com")) {
            const x = getSubString(e.message.content);
            const funny = await youtuberify(x);
            sendBotMessage(e.message.channel_id, { content: funny });
        }
    },

    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", this.onMessage);
    },

    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", this.onMessage);
    },
});
