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

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, OptionalMessageOption, RequiredMessageOption, sendBotMessage } from "@api/Commands";
import { Devs, EquicordDevs } from "@utils/constants";
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
    description: "Echo, Lenny, Mock, and More",
    authors: [Devs.Arjix, Devs.amy, Devs.Samu, EquicordDevs.zyqunix],
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
        },
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
        },
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
            name: "systeminfo",
            description: "Shows system information",
            options: [],
            execute: async (opts, ctx) => {
                try {
                    const { userAgent, hardwareConcurrency, onLine, languages } = navigator;
                    const { width, height, colorDepth } = window.screen;
                    const { deviceMemory, connection }: { deviceMemory: any, connection: any; } = navigator as any;
                    const platform = userAgent.includes("Windows") ? "Windows" :
                        userAgent.includes("Mac") ? "MacOS" :
                            userAgent.includes("Linux") ? "Linux" : "Unknown";
                    const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
                    const deviceType = isMobile ? "Mobile" : "Desktop";
                    const browserInfo = userAgent.match(/(?:chrome|firefox|safari|edge|opr)\/?\s*(\d+)/i)?.[0] || "Unknown";
                    const networkInfo = connection ? `${connection.effectiveType || "Unknown"}` : "Unknown";
                    const info = [
                        `> **Platform**: ${platform}`,
                        `> **Device Type**: ${deviceType}`,
                        `> **Browser**: ${browserInfo}`,
                        `> **CPU Cores**: ${hardwareConcurrency || "N/A"}`,
                        `> **Memory**: ${deviceMemory ? `${deviceMemory}GB` : "N/A"}`,
                        `> **Screen**: ${width}x${height} (${colorDepth}bit)`,
                        `> **Languages**: ${languages?.join(", ")}`,
                        `> **Network**: ${networkInfo} (${onLine ? "Online" : "Offline"})`
                    ].join("\n");
                    return { content: info };
                } catch (err) {
                    sendBotMessage(ctx.channel.id, { content: "Failed to fetch system information" });
                }
            },
        },
        {
            name: "getUptime",
            description: "Returns the system uptime",
            execute: async (opts, ctx) => {
                const uptime = performance.now() / 1000;
                const uptimeInfo = `> **System Uptime**: ${Math.floor(uptime / 60)} minutes`;
                return { content: uptimeInfo };
            },
        },
        {
            name: "getTime",
            description: "Returns the current server time",
            execute: async (opts, ctx) => {
                const currentTime = new Date().toLocaleString();
                return { content: `> **Current Time**: ${currentTime}` };
            },
        },
        {
            name: "getLocation",
            description: "Returns the user's approximate location based on IP",
            execute: async (opts, ctx) => {
                try {
                    const response = await fetch("https://ipapi.co/json/");
                    const data = await response.json();
                    const locationInfo = `> **Country**: ${data.country_name}\n> **Region**: ${data.region}\n> **City**: ${data.city}`;
                    return { content: locationInfo };
                } catch (err) {
                    sendBotMessage(ctx.channel.id, { content: "Failed to fetch location information" });
                }
            },
        },
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
                const reverse = findOption(opts, "reverse") as string | undefined;

                if (transform !== "same") {
                    text = (text as any)[transform]?.call(text) ?? text;
                }

                if (normalize) text = text.normalize(normalize);
                if (reverse) text = text.split("").reverse().join("");

                return { content: text.repeat(repeat) };
            }
            ,
        },
    ]
});
