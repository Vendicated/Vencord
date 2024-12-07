/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, registerCommand, sendBotMessage, unregisterCommand } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const EMOTE = "<:luna:1035316192220553236>";
const DATA_KEY = "MessageTags_TAGS";
const MessageTagsMarker = Symbol("MessageTags");

interface Tag {
    name: string;
    message: string;
    enabled: boolean;
    variables: string[];
}

const getTags = () => DataStore.get(DATA_KEY).then<Tag[]>(t => t ?? []);
const getTag = (name: string) => DataStore.get(DATA_KEY).then<Tag | null>((t: Tag[]) => (t ?? []).find((tt: Tag) => tt.name === name) ?? null);
const addTag = async (tag: Tag) => {
    const tags = await getTags();
    tags.push(tag);
    DataStore.set(DATA_KEY, tags);
    return tags;
};
const removeTag = async (name: string) => {
    let tags = await getTags();
    tags = await tags.filter((t: Tag) => t.name !== name);
    DataStore.set(DATA_KEY, tags);
    return tags;
};

function detectVariables(message: string): string[] {
    const matches = message.match(/{(.*?)}/g) || [];
    return Array.from(new Set(matches.map((variable: string) => variable.slice(1, -1))));
}

function replaceVariables(message: string, replacements: Record<string, string>) {
    for (const [key, value] of Object.entries(replacements)) {
        message = message.replaceAll(`{${key}}`, value);
    }
    return message;
}

function createTagCommand(tag: Tag) {
    registerCommand({
        name: tag.name,
        description: tag.name,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        options: tag.variables ? tag.variables.map(variable => ({
            name: variable,
            description: `Value for ${variable}`,
            type: ApplicationCommandOptionType.STRING,
            required: true,
        })) : [],
        execute: async (args, ctx) => {
            const existingTag = await getTag(tag.name);
            if (!existingTag) {
                sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} The tag **${tag.name}** does not exist anymore! Please reload Discord to fix :)`
                });
                return { content: `/${tag.name}` };
            }

            const replacements = Object.fromEntries(
                tag.variables.map(variable => [variable, findOption(args, variable, "")])
            );

            const finalMessage = replaceVariables(existingTag.message, replacements).replaceAll("\\n", "\n");

            if (Settings.plugins.MessageTags.clyde) {
                sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} The tag **${tag.name}** has been sent!`
                });
            }

            return { content: finalMessage };
        },
        [MessageTagsMarker]: true,
    }, "CustomTags");
}


export default definePlugin({
    name: "MessageTags",
    description: "Allows you to save messages and to use them with a simple command, now with variable support.",
    authors: [Devs.Luna, Devs.SUDO],
    options: {
        clyde: {
            name: "Clyde message on send",
            description: "If enabled, Clyde will send you an ephemeral message when a tag was used.",
            type: OptionType.BOOLEAN,
            default: true
        }
    },

    async start() {
        const tags = await getTags();
        tags.forEach(tag => {
            createTagCommand(tag);
        });
    },

    commands: [
        {
            name: "tags",
            description: "Manage all the tags for yourself",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "create",
                    description: "Create a new tag",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "tag-name",
                            description: "The name of the tag to trigger the response",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        },
                        {
                            name: "message",
                            description: "The message that you will send when using this tag, you can use placeholders like {user}",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                },
                {
                    name: "list",
                    description: "List all tags from yourself",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: []
                },
                {
                    name: "delete",
                    description: "Remove a tag from yourself",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "tag-name",
                            description: "The name of the tag to trigger the response",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                },
                {
                    name: "preview",
                    description: "Preview a tag without sending it publicly",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "tag-name",
                            description: "The name of the tag to trigger the response",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                }
            ],

            async execute(args, ctx) {

                switch (args[0].name) {
                    case "create": {
                        const name: string = findOption(args[0].options, "tag-name", "");
                        const message: string = findOption(args[0].options, "message", "");

                        if (await getTag(name))
                            return sendBotMessage(ctx.channel.id, {
                                content: `${EMOTE} A Tag with the name **${name}** already exists!`
                            });
                        const variables = detectVariables(message);
                        const tag: Tag = {
                            name: name,
                            enabled: true,
                            message: message,
                            variables: variables
                        };

                        createTagCommand(tag);
                        await addTag(tag);

                        sendBotMessage(ctx.channel.id, {
                            content: `${EMOTE} Successfully created the tag **${name}**!`
                        });
                        break; // end 'create'
                    }
                    case "delete": {
                        const name: string = findOption(args[0].options, "tag-name", "");

                        if (!await getTag(name))
                            return sendBotMessage(ctx.channel.id, {
                                content: `${EMOTE} A Tag with the name **${name}** does not exist!`
                            });

                        unregisterCommand(name);
                        await removeTag(name);

                        sendBotMessage(ctx.channel.id, {
                            content: `${EMOTE} Successfully deleted the tag **${name}**!`
                        });
                        break; // end 'delete'
                    }
                    case "list": {
                        sendBotMessage(ctx.channel.id, {
                            embeds: [
                                {
                                    title: "All Tags:",
                                    description: (await getTags())
                                        .map(tag => `\`${tag.name}\`: ${tag.message.slice(0, 72).replaceAll("\\n", " ")}${tag.message.length > 72 ? "..." : ""}`)
                                        .join("\n") || `${EMOTE} Woops! There are no tags yet, use \`/tags create\` to create one!`,
                                    // @ts-ignore
                                    color: 0xd77f7f,
                                    type: "rich",
                                }
                            ]
                        });
                        break; // end 'list'
                    }
                    case "preview": {
                        const name: string = findOption(args[0].options, "tag-name", "");
                        const tag = await getTag(name);

                        if (!tag)
                            return sendBotMessage(ctx.channel.id, {
                                content: `${EMOTE} A Tag with the name **${name}** does not exist!`
                            });

                        sendBotMessage(ctx.channel.id, {
                            content: tag.message.replaceAll("\\n", "\n")
                        });
                        break; // end 'preview'
                    }

                    default: {
                        sendBotMessage(ctx.channel.id, {
                            content: "Invalid sub-command"
                        });
                        break;
                    }
                }
            }
        }
    ]
});
