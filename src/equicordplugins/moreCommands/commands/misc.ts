/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, OptionalMessageOption, RequiredMessageOption, sendBotMessage } from "@api/Commands";
import { UserStore } from "@webpack/common";

import { getCuteAnimeBoys, getCuteNeko, getCutePats, mock } from "../utils";

export default [
    {
        name: "pat",
        description: "Sends a headpat gif",
        execute: async () => ({
            content: await getCutePats()
        })
    },
    {
        name: "nekos",
        description: "Send Neko",
        execute: async () => ({
            content: await getCuteNeko()
        })
    },
    {
        name: "anime-boys",
        description: "Send cute anime boys",
        options: [
            {
                name: "cat",
                description: "If set, this will send exclusively cute anime cat boys",
                type: ApplicationCommandOptionType.BOOLEAN,
                required: false,
            },
        ],
        execute: async opts => {
            let sub = "cuteanimeboys";
            const cat = findOption(opts, "cat") as boolean | undefined;
            if (cat) sub = "animecatboys";

            return { content: await getCuteAnimeBoys(sub) };
        },
    },
    {
        name: "ping",
        description: "Pings the bot to check if it's responding",
        options: [],
        inputType: ApplicationCommandInputType.BOT,
        execute: (opts, ctx) => {
            sendBotMessage(ctx.channel.id, {
                content: "Pong!"
            });
        },
    },
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
    {
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        name: "slap",
        description: "Slap someone/something.",
        options: [{
            name: "victim",
            description: "Thing to slap",
            required: true,
            type: ApplicationCommandOptionType.STRING,
        }],
        execute: opts => {
            const victim = findOption(opts, "victim") as string;
            return { content: `<@${UserStore.getCurrentUser().id}> slaps ${victim} around a bit with a large trout` };
        }
    }
];
