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

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

const MessageActions = findByPropsLazy("getSendMessageOptionsForReply", "sendMessage");

export default definePlugin({
    name: "MessageScheduler",
    description: "Allows you to schedule messages using a simple command.",
    authors: [Devs.Arrow],
    commands: [{
        name: "schedule",
        description: "Schedules a message to send after a specified delay",
        inputType: ApplicationCommandInputType.BOT,
        options: [{
            name: "message",
            type: ApplicationCommandOptionType.STRING,
            description: "The message to send after the delay",
            required: true,
        },
        {
            name: "delay",
            type: ApplicationCommandOptionType.NUMBER,
            description: "The delay in seconds, defaults to 1s",
            required: false,
        }],
        execute(args, ctx) {
            const message: string = findOption(args, "message", "");
            const delay: number = findOption(args, "delay", 1);
            setTimeout(() => {
                MessageActions.sendMessage(ctx.channel.id, { content: message, invalidEmojis: [], tts: false, validNonShortcutEmojis: [] });
            }, delay * 1000);
        }
    }],
});
