/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated, Samu and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, findOption, OptionalMessageOption, RequiredMessageOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


function mock(input: string): string {
    let output = "";
    for (let i = 0; i < input.length; i++) {
        output += i % 2 ? input[i].toUpperCase() : input[i].toLowerCase();
    }
    return output;
}

export default definePlugin({
    name: "MoreCommands",
    description: "echo, lenny, mock",
    authors: [Devs.Arjix, Devs.echo, Devs.Samu],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "echo",
            description: "Sends a message as Clyde (locally)",
            options: [OptionalMessageOption],
            inputType: ApplicationCommandInputType.BOT,
            execute: (opts, ctx) => {
                const content = findOption(opts, "message", "");

                sendBotMessage(ctx.channel.id, { content });
            },
        },
        {
            name: "lenny",
            description: "Sends a lenny face",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " ( ͡° ͜ʖ ͡°)"
            }),
        },
        {
            name: "mock",
            description: "mOcK PeOpLe",
            options: [RequiredMessageOption],
            execute: opts => ({
                content: mock(findOption(opts, "message", ""))
            }),
        },
    ]
});
