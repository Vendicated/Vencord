/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";

export default [
    {
        name: "countdown",
        description: "Starts a countdown from a specified number",
        options: [
            {
                name: "number",
                description: "Number to countdown from (max 10)",
                type: ApplicationCommandOptionType.INTEGER,
                required: true
            }
        ],
        inputType: ApplicationCommandInputType.BOT,
        execute: async (opts, ctx) => {
            const number = Math.min(parseInt(findOption(opts, "number", "5")), 10);
            if (isNaN(number) || number < 1) {
                sendBotMessage(ctx.channel.id, {
                    content: "Please provide a valid number between 1 and 10!"
                });
                return;
            }
            sendBotMessage(ctx.channel.id, {
                content: `Starting countdown from ${number}...`
            });
            for (let i = number; i >= 0; i--) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                sendBotMessage(ctx.channel.id, {
                    content: i === 0 ? "🎉 Go! 🎉" : `${i}...`
                });
            }
        },
    }
];
