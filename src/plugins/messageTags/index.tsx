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

import { ApplicationCommandInputType, ApplicationCommandOptionType, Argument, CommandContext, findOption, Option, registerCommand, sendBotMessage, unregisterCommand } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";

import { ParamsConfigModal, ParamsPreviewModal } from "./components/ParamsConfigModal";

const EMOTE = "<:luna:1035316192220553236>";
const DATA_KEY = "MessageTags_TAGS";
const MessageTagsMarker = Symbol("MessageTags");

export interface Param {
    name: string;
    default?: string;
}

interface Tag {
    name: string;
    message: string;
    params?: Param[];
}

function getTags() {
    return settings.store.tagsList;
}

function getTag(name: string) {
    return settings.store.tagsList[name] ?? null;
}

function addTag(tag: Tag) {
    settings.store.tagsList[tag.name] = tag;
}

function removeTag(name: string) {
    delete settings.store.tagsList[name];
}

function generateOptionsFromParamsTag(params: Param[] | null) {
    const options: Option[] = [];
    params?.forEach(param => {
        const notDefault = param.default === undefined;
        options.push({
            name: param.name,
            description: param.name + (!notDefault ? ` (Default: "${param.default}")` : ""),
            type: ApplicationCommandOptionType.STRING,
            required: notDefault,
        });
    });
    return options;
}

function createTagCommand(tag: Tag) {
    const options = generateOptionsFromParamsTag(tag.params || null);
    registerCommand({
        name: tag.name,
        description: tag.name,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        options,
        execute: async (args, ctx) => {
            if (!getTag(tag.name)) {
                sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} The tag **${tag.name}** does not exist anymore! Please reload ur Discord to fix :)`
                });
                return { content: `/${tag.name}` };
            }

            if (settings.store.clyde) sendBotMessage(ctx.channel.id, {
                content: `${EMOTE} The tag **${tag.name}** has been sent!`
            });
            let finalMessage = tag.message.replaceAll("\\n", "\n");
            args.forEach(arg => {
                finalMessage = finalMessage.replaceAll(`$${arg.name}$`, arg.value);
            });
            tag.params?.forEach(param => {
                if (!param.default) return;
                finalMessage = finalMessage.replaceAll(`$${param.name}$`, param.default);
            });
            return { content: finalMessage };
        },
        [MessageTagsMarker]: true,
    }, "CustomTags");
}

const settings = definePluginSettings({
    clyde: {
        name: "Clyde message on send",
        description: "If enabled, clyde will send you an ephemeral message when a tag was used.",
        type: OptionType.BOOLEAN,
        default: true
    },
    tagsList: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, Tag>,
    }
});

const execute = async (args: Argument[], ctx: CommandContext) => {
    switch (args[0].name) {
        case "create": {
            const name: string = findOption(args[0].options, "tag-name", "");
            const message: string = findOption(args[0].options, "message", "");

            if (getTag(name))
                return sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} A Tag with the name **${name}** already exists!`
                });

            const matches = new Set<string>();
            message.matchAll(/\$(\S+?)\$/g).forEach(match => { matches.add(match[1]); });
            const paramNames = Array.from(matches);

            const tag: Tag = {
                name: name,
                message: message,
                params: paramNames.length ? [] : undefined
            };

            paramNames.forEach(p => { tag.params?.push({ name: p }); });

            const createTag = () => {
                createTagCommand(tag);
                addTag(tag);
                sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} Successfully created the tag **${name}**!`
                });
                updateCommandsList();
            };
            if (!tag.params?.lastIndexOf) {
                createTag();
                break;
            }
            openModal(modalProps => (<ParamsConfigModal
                modalProps={modalProps}
                params={paramNames}
                onSave={(values: { [key: string]: string; }) => {
                    tag.params = tag.params?.map(param => ({
                        ...param,
                        default: values[param.name] || undefined,
                    }));
                    createTag();
                }}
            />));
            break; // end 'create'
        }
        case "delete": {
            const name: string = findOption(args[0].options, "tag-name", "");

            if (!getTag(name))
                return sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} A Tag with the name **${name}** does not exist!`
                });

            unregisterCommand(name);
            removeTag(name);
            updateCommandsList();

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
                        description: Object.values(getTags())
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
            const tag = getTag(name);

            if (!tag)
                return sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} A Tag with the name **${name}** does not exist!`
                });
            let finalMessage = tag.message.replaceAll("\\n", "\n");
            const preview = () => {
                sendBotMessage(ctx.channel.id, {
                    content: finalMessage
                });
            };
            if (!tag.params?.length) {
                preview();
                break;
            }
            openModal(modalProps => (<ParamsPreviewModal
                modalProps={modalProps}
                params={tag.params || []}
                onSave={(values: { [key: string]: string; }) => {
                    tag.params?.forEach(p => {
                        finalMessage = finalMessage.replaceAll(`$${p.name}$`, values[p.name]);
                    });
                    preview();
                }}
            />));
            break; // end 'preview'
        }

        default: {
            sendBotMessage(ctx.channel.id, {
                content: "Invalid sub-command"
            });
            break;
        }
    }
};

const updateCommandsList = () => {
    unregisterCommand("tags delete");
    unregisterCommand("tags preview");
    const newChoicesList = Object.keys(getTags()).map(e => ({
        label: e,
        value: e,
        name: e
    }));
    registerCommand({
        name: "tags",
        description: "Manage all the tags for yourself",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "delete",
                description: "Remove a tag from yourself",
                type: ApplicationCommandOptionType.SUB_COMMAND,
                options: [
                    {
                        name: "tag-name",
                        description: "The name of the tag to delete",
                        type: ApplicationCommandOptionType.STRING,
                        required: true,
                        choices: newChoicesList
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
                        description: "The name of the tag to preview the response",
                        type: ApplicationCommandOptionType.STRING,
                        required: true,
                        choices: newChoicesList
                    }
                ]
            }
        ],
        execute
    }, "MessageTags");
};

export default definePlugin({
    name: "MessageTags",
    description: "Allows you to save messages and to use them with a simple command.",
    authors: [Devs.Luna, Devs.Benjas333],
    settings,

    async start() {
        // TODO(OptionType.CUSTOM Related): Remove DataStore tags migration once enough time has passed
        const oldTags = await DataStore.get<Tag[]>(DATA_KEY);
        if (oldTags != null) {
            // @ts-ignore
            settings.store.tagsList = Object.fromEntries(oldTags.map(oldTag => (delete oldTag.enabled, [oldTag.name, oldTag])));
            await DataStore.del(DATA_KEY);
        }

        const tags = getTags();
        for (const tagName in tags) {
            createTagCommand(tags[tagName]);
        }
        updateCommandsList();
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
                            description: "The message that you will send when using this tag. For custom parameters use double $ (example: $name$)",
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
                    description: "Remove a tag from your yourself",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "tag-name",
                            description: "The name of the tag to delete",
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
                            description: "The name of the tag to preview the response",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                }
            ],

            execute,
        }
    ]
});
