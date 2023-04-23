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

import { ApplicationCommandInputType, ApplicationCommandOptionType, ChoicesOption, findOption, registerCommand, sendBotMessage, unregisterCommand } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { Settings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { SelectedChannelStore } from "@webpack/common";

const EMOTE = "<:luna:1035316192220553236>";
const DATA_KEY = "MessageTags_TAGS";
const MessageTagsMarker = Symbol("MessageTags");
const author = {
    id: "821472922140803112",
    bot: false
};

interface Tag {
    name: string;
    message: string;
    enabled: boolean;
    hotkey: string | null;
}

const getTags = () => DataStore.get(DATA_KEY).then<Tag[]>(t => t ?? []);
const getTag = (name: string) => DataStore.get(DATA_KEY).then<Tag | null>((t: Tag[]) => (t ?? []).find((tt: Tag) => tt.name === name) ?? null);
const getTagByHotkey = (hotkey: string) => DataStore.get(DATA_KEY).then<Tag | null>((t: Tag[]) => (t ?? []).find((tt: Tag) => tt.hotkey === hotkey) ?? null);
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


const MessageActions = findByPropsLazy("sendGreetMessage");

const bindableHotkeys: ChoicesOption[] = [];

function createTagCommand(tag: Tag) {
    registerCommand({
        name: tag.name,
        description: tag.name,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        execute: async (_, ctx) => {
            if (!await getTag(tag.name)) {
                sendBotMessage(ctx.channel.id, {
                    author,
                    content: `${EMOTE} The tag **${tag.name}** does not exist anymore! Please reload ur Discord to fix :)`
                });
                return { content: `/${tag.name}` };
            }

            if (Settings.plugins.MessageTags.clyde) sendBotMessage(ctx.channel.id, {
                author,
                content: `${EMOTE} The tag **${tag.name}** has been sent!`
            });
            return { content: tag.message.replaceAll("\\n", "\n") };
        },
        [MessageTagsMarker]: true,
    }, "CustomTags");
}

export default definePlugin({
    name: "MessageTags",
    description: "Allows you to save messages and to use them with a simple command or by a hotkey.",
    authors: [Devs.Luna, Devs.Mufaro],
    options: {
        clyde: {
            name: "Clyde message on send",
            description: "If enabled, clyde will send you an ephemeral message when a tag was used.",
            type: OptionType.BOOLEAN,
            default: true
        }
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
                            description: "The message that you will send when using this tag",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        },
                        {
                            name: "key",
                            description: "The key that will trigger this tag",
                            type: ApplicationCommandOptionType.STRING,
                            required: false,
                            choices: bindableHotkeys
                        },
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
                },
                {
                    name: "purge",
                    description: "Remove all tags from yourself",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: []
                }
            ],

            async execute(args, ctx) {

                switch (args[0].name) {
                    case "create": {
                        const name: string = findOption(args[0].options, "tag-name", "");
                        const message: string = findOption(args[0].options, "message", "");
                        const key: string = findOption(args[0].options, "key", "");

                        if (await getTag(name))
                            return sendBotMessage(ctx.channel.id, {
                                author,
                                content: `${EMOTE} A Tag with the name **${name}** already exists!`
                            });
                        else if (key && await getTagByHotkey(key))
                            return sendBotMessage(ctx.channel.id, {
                                author,
                                content: `${EMOTE} A Tag with the key **${key}** already exists!`
                            });

                        const tag = {
                            name: name,
                            enabled: true,
                            message: message,
                            hotkey: key || null
                        };

                        createTagCommand(tag);
                        await addTag(tag);

                        sendBotMessage(ctx.channel.id, {
                            author,
                            embeds: [{
                                // @ts-ignore
                                description: `${EMOTE} Successfully created the tag **${name}**!\n\n ${key && `**Key:** ${key}\n`}**Message:**\n\`\`\`${message}\`\`\``,
                                color: "0xd77f7f",
                                type: "rich"
                            }]
                        });

                        break; // end 'create'
                    }

                    case "delete": {
                        const name: string = findOption(args[0].options, "tag-name", "");

                        if (!await getTag(name))
                            return sendBotMessage(ctx.channel.id, {
                                author,
                                content: `${EMOTE} A Tag with the name **${name}** does not exist!`
                            });

                        unregisterCommand(name);
                        await removeTag(name);

                        sendBotMessage(ctx.channel.id, {
                            author,
                            content: `${EMOTE} Successfully deleted the tag **${name}**!`
                        });

                        break; // end 'delete'
                    }
                    case "list": {
                        sendBotMessage(ctx.channel.id, {
                            author,
                            embeds: [
                                {
                                    // @ts-ignore
                                    title: "All Tags:",
                                    // @ts-ignore
                                    description: (await getTags())
                                        .map(tag => `${tag.hotkey && `**[${tag.hotkey}]**`} \`${tag.name}\`: ${tag.message.slice(0, 72).replaceAll("\\n", " ")}${tag.message.length > 72 ? "..." : ""}`)
                                        .join("\n") || `${EMOTE} Woops! There are no tags yet, use \`/tags create\` to create one!`,
                                    color: "0xd77f7f",
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
                                author,
                                content: `${EMOTE} A Tag with the name **${name}** does not exist!`
                            });

                        sendBotMessage(ctx.channel.id, {
                            author,
                            content: tag.message.replaceAll("\\n", "\n")
                        });

                        break; // end 'preview'
                    }

                    case "purge": {
                        const tags = await getTags();
                        for (const tag of tags) unregisterCommand(tag.name);
                        DataStore.set(DATA_KEY, []);
                        sendBotMessage(ctx.channel.id, {
                            author,
                            content: `${EMOTE} Successfully purged all tags!`
                        });

                        break; // end 'purge'
                    }


                    default: {
                        sendBotMessage(ctx.channel.id, {
                            author,
                            content: "Invalid sub-command"
                        });

                        break;
                    }
                }
            }
        }
    ],

    async start() {
        createKeys();
        document.addEventListener("keydown", this.onKeyDown);
        for (const tag of await getTags()) createTagCommand(tag);
    },

    async stop() {
        document.removeEventListener("keydown", this.onKeyDown);
        for (const tag of await getTags()) unregisterCommand(tag.name);
    },

    async onKeyDown(e: KeyboardEvent) {
        if (e.repeat) return;
        const tag = await getTagByHotkey(e.code);
        if (!tag?.hotkey) return;
        const message = {
            content: tag.message,
            validNonShortcutEmojis: []
        };
        const channelId = SelectedChannelStore.getChannelId();
        if (Settings.plugins.MessageTags.clyde) sendBotMessage(channelId, {
            author,
            content: `${EMOTE} The tag **${tag.name}** has been sent!`
        });
        MessageActions.sendMessage(channelId, message, void 0);
    },


});


const bindableKeys = [
    "Backspace",
    "Tab",
    "ShiftRight",
    "ControlRight",
    "AltRight",
    "CapsLock",
    "Escape",
    "End",
    "Home",
    "ArrowLeft",
    "ArrowUp",
    "ArrowRight",
    "ArrowDown",
    "Insert",
    "Delete",
    "ScrollLock",
    "NumLock",
    "Pause",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
    "Numpad0",
    "Numpad1",
    "Numpad2",
    "Numpad3",
    "Numpad4",
    "Numpad5",
    "Numpad6",
    "Numpad7",
    "Numpad8",
    "Numpad9",
    "NumpadAdd",
    "NumpadSubtract",
    "NumpadMultiply",
    "NumpadDivide",
    "NumpadDecimal",
];

function createKeys() {
    for (let i = 0; i < bindableKeys.length; i++) {
        const key = bindableKeys[i];
        bindableHotkeys.push({
            name: key,
            value: key,
            label: key
        });
    }
}
