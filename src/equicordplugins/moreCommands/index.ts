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
import { addMessagePreEditListener, addMessagePreSendListener, MessageObject, removeMessagePreEditListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { Devs, EquicordDevs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

import { fromMorse, getCuteAnimeBoys, getCuteNeko, getCutePats, isMorse, makeFreaky, mock, settings, toMorse, uwuify, uwuifyArray } from "./utils";

export default definePlugin({
    name: "MoreCommands",
    description: "Adds various fun and useful commands",
    authors: [Devs.Arjix, Devs.amy, Devs.Samu, EquicordDevs.zyqunix, EquicordDevs.ShadyGoat, Devs.thororen, Devs.Korbo, Devs.nyx, Devs.amy],
    settings,
    commands: [
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
            name: "getuptime",
            description: "Returns the system uptime",
            execute: async () => {
                const uptime = performance.now() / 1000;
                const uptimeInfo = `> **System Uptime**: ${Math.floor(uptime / 60)} minutes`;
                return { content: uptimeInfo };
            },
        },
        {
            name: "gettime",
            description: "Returns the current server time",
            execute: async () => {
                const currentTime = new Date().toLocaleString();
                return { content: `> **Current Time**: ${currentTime}` };
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
        },
        {
            name: "freaky",
            description: "it's freaky.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [{
                name: "message",
                description: "yoooo freaky",
                type: ApplicationCommandOptionType.STRING,
                required: true
            }],
            execute: (opts, ctx) => {
                sendMessage(ctx.channel.id, { content: makeFreaky(findOption(opts, "message", "")) });
            }
        },
        {
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            name: "morse",
            description: "Translate to or from Morse code",
            options: [
                {
                    name: "text",
                    description: "Text to convert",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
            ],
            execute: opts => {
                const input = opts.find(o => o.name === "text")?.value as string;
                const output = isMorse(input) ? fromMorse(input) : toMorse(input);
                return {
                    content: `${output}`
                };
            },
        },
        {
            name: "uwuify",
            description: "uwuifies your messages",
            options: [RequiredMessageOption],
            execute: opts => ({
                content: uwuify(findOption(opts, "message", "")),
            }),
        },
    ],
    patches: [
        {
            find: ".isPureReactComponent=!0;",
            predicate: () => settings.store.uwuEverything,
            replacement: {
                match: /(?<=.defaultProps\)void 0.{0,60})(\i)\)/,
                replace: "$self.uwuifyProps($1))"
            }
        }
    ],
    uwuifyProps(props: any) {
        if (!props.children) return props;
        if (typeof props.children === "string") props.children = uwuify(props.children);
        else if (Array.isArray(props.children)) props.children = uwuifyArray(props.children);
        return props;
    },

    onSend(msg: MessageObject) {
        // Only run when it's enabled
        if (settings.store.uwuEveryMessage) {
            msg.content = uwuify(msg.content);
        }
    },

    start() {
        this.preSend = addMessagePreSendListener((_, msg) => this.onSend(msg));
        this.preEdit = addMessagePreEditListener((_cid, _mid, msg) =>
            this.onSend(msg)
        );
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
        removeMessagePreEditListener(this.preEdit);
    },
});
