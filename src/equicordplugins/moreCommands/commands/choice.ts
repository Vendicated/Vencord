/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandOptionType, findOption, RequiredMessageOption, sendBotMessage } from "@api/Commands";

export default [
    {
        name: "choose",
        description: "Randomly chooses from provided options",
        options: [
            {
                name: "choices",
                description: "Comma-separated list of choices",
                type: ApplicationCommandOptionType.STRING,
                required: true
            }
        ],
        execute: opts => {
            const choices = findOption(opts, "choices", "").split(",").map(c => c.trim());
            const choice = choices[Math.floor(Math.random() * choices.length)];
            return {
                content: `I choose: ${choice}`
            };
        }
    },
    {
        name: "rolldice",
        description: "Roll a die with the specified number of sides",
        options: [RequiredMessageOption],
        execute: opts => {
            const sides = parseInt(findOption(opts, "message", "6"));
            const roll = Math.floor(Math.random() * sides) + 1;
            return {
                content: `You rolled a ${roll}!`
            };
        },
    },
    {
        name: "flipcoin",
        description: "Flips a coin and returns heads or tails",
        options: [],
        execute: (opts, ctx) => {
            const flip = Math.random() < 0.5 ? "Heads" : "Tails";
            return {
                content: `The coin landed on: ${flip}`
            };
        },
    },
    {
        name: "ask",
        description: "Ask a yes/no question and get an answer",
        options: [RequiredMessageOption],
        execute: opts => {
            const question = findOption(opts, "message", "");
            const responses = ["Yes", "No", "Maybe", "Ask again later", "Definitely not", "It is certain"];
            const response = responses[Math.floor(Math.random() * responses.length)];
            return {
                content: `${question} - ${response}`
            };
        },
    },
    {
        name: "randomanimal",
        description: "Get a random cat picture",
        options: [
            {
                name: "animal",
                description: "pick your animal",
                type: ApplicationCommandOptionType.STRING,
                required: true,
                choices: [
                    { name: "cat", value: "cat", label: "cat" },
                    { name: "dog", value: "dog", label: "dog" },
                ]
            }
        ],
        execute: (opts, ctx) => {
            return (async () => {
                const animal = findOption(opts, "animal") as string;
                let url;
                if (animal === "cat") {
                    url = "https://api.thecatapi.com/v1/images/search";
                } else if (animal === "dog") {
                    url = "https://api.thedogapi.com/v1/images/search";
                }
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Failed to fetch ${animal} image`);
                    const data = await response.json();
                    return {
                        content: data[0].url
                    };
                } catch (err) {
                    sendBotMessage(ctx.channel.id, {
                        content: "Sorry, couldn't fetch a cat picture right now 😿"
                    });
                }
            })();
        },
    },
    {
        name: "randomnumber",
        description: "Generates a random number between two values",
        options: [
            {
                name: "min",
                description: "Minimum value",
                type: ApplicationCommandOptionType.INTEGER,
                required: true
            },
            {
                name: "max",
                description: "Maximum value",
                type: ApplicationCommandOptionType.INTEGER,
                required: true
            }
        ],
        execute: opts => {
            const min = parseInt(findOption(opts, "min", "0"));
            const max = parseInt(findOption(opts, "max", "100"));
            const number = Math.floor(Math.random() * (max - min + 1)) + min;
            return {
                content: `Random number between ${min} and ${max}: ${number}`
            };
        }
    }
];
