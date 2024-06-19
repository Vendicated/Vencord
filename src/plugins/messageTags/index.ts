/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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
    tags = tags.filter((t: Tag) => t.name !== name);
    DataStore.set(DATA_KEY, tags);
    return tags;
};

async function replaceSubTags(message: string) {
    const templates = message.match(/\[insert-tag:.{1,32}?\]/gi);

    if (templates?.length) {
        for (const template of templates) {
            const name = template.split(":")[1].slice(0, -1);
            const tag = await getTag(name);

            message = message.replace(
                template,
                tag?.message || `[invalid tag: ${name}]`
            );
        }
    }

    return message;
}

function createTagCommand(tag: Tag) {
    registerCommand({
        name: tag.name,
        description: tag.name,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        execute: async (_, ctx) => {
            if (!await getTag(tag.name)) {
                sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} The tag **${tag.name}** does not exist anymore! Please reload ur Discord to fix :)`
                });

                return { content: `/${tag.name}` };
            }

            if (Settings.plugins.MessageTags.clyde) {
                sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} The Tag **${tag.name}** has been sent!`
                });
            }

            const message = await replaceSubTags(tag.message);

            return { content: message.replaceAll("\\n", "\n") };
        },
        [MessageTagsMarker]: true,
    }, "CustomTags");
}


export default definePlugin({
    name: "MessageTags",
    description: "Allows you to save messages and to use them with a simple command.",
    authors: [Devs.Luna],
    options: {
        clyde: {
            name: "Clyde message on send",
            description: "If enabled, clyde will send you an ephemeral message when a tag was used.",
            type: OptionType.BOOLEAN,
            default: true
        }
    },
    dependencies: ["CommandsAPI"],

    async start() {
        for (const tag of await getTags()) createTagCommand(tag);
    },

    commands: [
        {
            name: "tags",
            description: "Manage all your custom commands.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "create",
                    description: "Create a new custom slash command.",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "name",
                            description: "The name of the command to trigger the response.",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        },
                        {
                            name: "message",
                            description: "The message that will sent as you when using this tag.",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                },
                {
                    name: "list",
                    description: "List all your custom commands.",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: []
                },
                {
                    name: "delete",
                    description: "Delete a custom slash command.",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "name",
                            description: "The name of the command to trigger the response.",
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
                            name: "name",
                            description: "The name of the command to trigger the response.",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                }
            ],

            async execute(args, ctx) {

                switch (args[0].name) {
                    case "create": {
                        const name = findOption(args[0].options, "name", "") as string;
                        const message = findOption(args[0].options, "message", "") as string;

                        if (await getTag(name)) {
                            sendBotMessage(ctx.channel.id, {
                                content: `${EMOTE} A Tag with the name **${name}** already exists!`
                            });

                            return;
                        }

                        const tag = {
                            name: name,
                            enabled: true,
                            message: message
                        };

                        await addTag(tag);
                        createTagCommand(tag);

                        sendBotMessage(ctx.channel.id, {
                            content: `${EMOTE} Successfully created the tag **${name}**!`
                        });

                        break; // end 'create'
                    }
                    case "delete": {
                        const name = findOption(args[0].options, "name", "") as string;

                        if (!await getTag(name)) {
                            sendBotMessage(ctx.channel.id, {
                                content: `${EMOTE} No Tag with the name **${name}** does exist!`
                            });

                            return;
                        }

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
                                    // @ts-ignore
                                    title: "All Tags:",
                                    // @ts-ignore
                                    description: (await getTags())
                                        .map(tag => `\`${tag.name}\`: ${tag.message.slice(0, 64).replaceAll("\\n", " ")}${tag.message.length > 64 ? "..." : ""}`)
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
                        const name = findOption(args[0].options, "name", "") as string;
                        const tag = await getTag(name);

                        if (!tag) {
                            sendBotMessage(ctx.channel.id, {
                                content: `${EMOTE} No Tag with the name **${name}** does exist!`
                            });

                            return;
                        }

                        const message = await replaceSubTags(tag.message);

                        sendBotMessage(ctx.channel.id, {
                            content: message.replaceAll("\\n", "\n")
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