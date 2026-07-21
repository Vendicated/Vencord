/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const DATA_KEY = "QuickSnippets_snippets";
const NAME_REGEX = /^[\w-]+$/;

let snippets: Record<string, string> = {};

const settings = definePluginSettings({
    prefix: {
        type: OptionType.STRING,
        description: "Trigger prefix typed before a snippet name (e.g. ;brb)",
        default: ";"
    }
});

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyVariables(content: string) {
    const now = new Date();
    return content
        .replaceAll("\\n", "\n")
        .replaceAll("{date}", now.toLocaleDateString())
        .replaceAll("{time}", now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
        .replace(/\{random:([^}]+)\}/g, (_, choices: string) => {
            const parts = choices.split("|");
            return parts[Math.floor(Math.random() * parts.length)].trim();
        });
}

function expandSnippets(content: string) {
    const prefix = settings.store.prefix;
    if (!prefix) return content;

    const triggerRegex = new RegExp(`(^|\\s)${escapeRegex(prefix)}([\\w-]+)`, "g");
    return content.replace(triggerRegex, (full, lead: string, name: string) => {
        const snippet = snippets[name.toLowerCase()];
        return snippet === undefined ? full : lead + applyVariables(snippet);
    });
}

function saveSnippets() {
    return DataStore.set(DATA_KEY, snippets);
}

export default definePlugin({
    name: "QuickSnippets",
    description: "Text-expander snippets: type ;name in chat and it gets replaced with your saved template on send. Supports {date}, {time} and {random:a|b|c} variables",
    authors: [Devs.Kadrxy],
    settings,

    async start() {
        snippets = await DataStore.get(DATA_KEY) ?? {};
    },

    onBeforeMessageSend(_, msg) {
        msg.content = expandSnippets(msg.content);
    },

    commands: [
        {
            name: "snippet",
            description: "Manage your quick reply snippets",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "add",
                    description: "Add or update a snippet",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "name",
                            description: "Trigger name (letters, numbers, - and _ only)",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        },
                        {
                            name: "content",
                            description: "Text to expand to. Use \\n for new lines, {date}, {time}, {random:a|b|c}",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                },
                {
                    name: "remove",
                    description: "Remove a snippet",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "name",
                            description: "Trigger name of the snippet to remove",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                },
                {
                    name: "list",
                    description: "List all your snippets",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: []
                }
            ],

            async execute(args, ctx) {
                const prefix = settings.store.prefix;

                switch (args[0].name) {
                    case "add": {
                        const name = findOption(args[0].options, "name", "").toLowerCase();
                        const content = findOption(args[0].options, "content", "");

                        if (!NAME_REGEX.test(name))
                            return sendBotMessage(ctx.channel.id, {
                                content: `**${name}** is not a valid name! Use only letters, numbers, \`-\` and \`_\`.`
                            });

                        const existed = name in snippets;
                        snippets[name] = content;
                        await saveSnippets();

                        return sendBotMessage(ctx.channel.id, {
                            content: `${existed ? "Updated" : "Created"} snippet **${name}** — type \`${prefix}${name}\` in chat to use it!`
                        });
                    }

                    case "remove": {
                        const name = findOption(args[0].options, "name", "").toLowerCase();

                        if (!(name in snippets))
                            return sendBotMessage(ctx.channel.id, {
                                content: `A snippet named **${name}** does not exist!`
                            });

                        delete snippets[name];
                        await saveSnippets();

                        return sendBotMessage(ctx.channel.id, {
                            content: `Deleted snippet **${name}**!`
                        });
                    }

                    case "list": {
                        const entries = Object.entries(snippets);
                        const content = entries
                            .map(([name, text]) => `\`${prefix}${name}\`: ${text.length > 72 ? text.slice(0, 72) + "..." : text}`)
                            .join("\n");

                        return sendBotMessage(ctx.channel.id, {
                            content: content || "You have no snippets yet, use `/snippet add` to create one!"
                        });
                    }
                }
            }
        }
    ]
});
