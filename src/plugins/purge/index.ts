/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import definePlugin from "@utils/types";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { findByProps } from "@webpack";
import { UserStore } from "@webpack/common";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function getToken(): string {
    const AuthStore = findByProps("getToken");
    const token = AuthStore?.getToken?.();
    if (!token) throw new Error("[Purge] Could not get token!");
    return token;
}

async function fetchMessagesWithAPI(channelId: string, before?: string, limit = 50) {
    const token = getToken();
    const url = new URL(`https://discord.com/api/v9/channels/${channelId}/messages`);
    url.searchParams.set("limit", String(limit));
    if (before) url.searchParams.set("before", before);

    const res = await fetch(url.toString(), {
        headers: { "Authorization": token }
    });

    if (!res.ok) return [];
    return res.json();
}

async function deleteMessageWithAPI(channelId: string, messageId: string) {
    const token = getToken();
    const res = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}`, {
        method: "DELETE",
        headers: {
            "Authorization": token,
            "Content-Type": "application/json"
        }
    });
    return res.ok;
}

async function purgeMessages(channelId: string, amount?: number) {
    let deleted = 0;
    let before: string | undefined;
    const currentUser = UserStore.getCurrentUser();

    while (true) {
        const messages = await fetchMessagesWithAPI(channelId, before, 50);
        if (!messages.length) break;

        for (const m of messages) {
            if (m.author.id !== currentUser.id) continue;

            const ok = await deleteMessageWithAPI(channelId, m.id);
            if (ok) deleted++;

            await sleep(800);

            if (amount && deleted >= amount) return deleted;
        }

        before = messages[messages.length - 1].id;
    }

    return deleted;
}

export default definePlugin({
    name: "Purge",
    description: "Adds a /purge command to delete your own messages in the current channel, similar to UnDiscord.",
    authors: [Devs.plxne],

    commands: [{
        name: "purge",
        description: "Delete your own messages in this channel immediately.",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "amount",
                description: "How many messages to delete (default = all)",
                type: ApplicationCommandOptionType.INTEGER,
                required: false
            }
        ],
        execute: async (args, ctx) => {
            const amount = findOption(args, "amount", undefined) as number | undefined;

            try {
                const deleted = await purgeMessages(ctx.channel.id, amount);
                sendBotMessage(ctx.channel.id, {
                    content: `✅ Purged ${deleted} of your messages in this channel.`
                });
            } catch (err) {
                sendBotMessage(ctx.channel.id, {
                    content: `❌ Error while purging messages: ${err}`
                });
            }
        }
    }]
});
