/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, RequiredMessageOption, sendBotMessage } from "@api/Commands";

export default [
    {
        name: "transform",
        description: "Transform your text with the specified option",
        options: [
            {
                name: "text",
                description: "TEXT TO UPPERCASE",
                type: ApplicationCommandOptionType.STRING,
                required: true
            },
            {
                name: "transformation",
                description: "transformation to apply to your text",
                type: ApplicationCommandOptionType.STRING,
                required: true,
                choices: [
                    { name: "toLowerCase", value: "toLowerCase", label: "toLowerCase" },
                    { name: "toUpperCase", value: "toUpperCase", label: "toUpperCase" },
                    { name: "toLocaleLowerCase", value: "toLocaleLowerCase", label: "toLocaleLowerCase" },
                    { name: "toLocaleUpperCase", value: "toLocaleUpperCase", label: "toLocaleUpperCase" },
                    { name: "stay the same", value: "same", label: "stay the same" }
                ]
            },
            {
                name: "repeat",
                description: "how many times to repeat",
                type: ApplicationCommandOptionType.INTEGER,
                required: false
            },
            {
                name: "reverse",
                description: "reverse your text",
                type: ApplicationCommandOptionType.BOOLEAN,
                required: false
            },
            {
                name: "normalize",
                description: "which normailze option to use",
                type: ApplicationCommandOptionType.STRING,
                required: false,
                choices: [
                    { name: "NFC", value: "NFC", label: "NFC" },
                    { name: "NFD", value: "NFD", label: "NFD" },
                    { name: "NFKC", value: "NFKC", label: "NFKC" },
                    { name: "NFKD", value: "NFKD", label: "NFKD" }
                ]
            },
        ],
        execute: opts => {
            let text = findOption(opts, "text") as string;
            const transform = findOption(opts, "transformation") as string;
            const repeat = findOption(opts, "repeat") as number | undefined ?? 1;
            const normalize = findOption(opts, "normalize") as string | undefined;
            const reverse = findOption(opts, "reverse") as boolean | undefined;

            if (transform !== "same") {
                text = (text as any)[transform]?.call(text) ?? text;
            }

            if (normalize) text = text.normalize(normalize);
            if (reverse) text = text.split("").reverse().join("");

            return { content: text.repeat(repeat) };
        },
    },
    {
        name: "wordcount",
        description: "Counts the number of words in a message",
        options: [RequiredMessageOption],
        inputType: ApplicationCommandInputType.BOT,
        execute: (opts, ctx) => {
            const message = findOption(opts, "message", "");
            const wordCount = message.trim().split(/\s+/).length;
            sendBotMessage(ctx.channel.id, {
                content: `The message contains ${wordCount} words.`
            });
        },
    }
];
