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

import { DataStore } from "../api";
import { BUILT_IN, commands, prepareOption, registerCommand, unregisterCommand } from "../api/Commands";
import { findOption, sendBotMessage } from "../api/Commands/commandHelpers";
import { ApplicationCommandInputType, ApplicationCommandOptionType, Option } from "../api/Commands/types";
import { Settings } from "../api/settings";
import { Devs } from "../utils/constants";
import definePlugin, { OptionType } from "../utils/types";
import { sendMessage } from "./sendify";

const DATA_KEY = "CustomTags_tags";
const mSettings = Settings.plugins.CustomTags;
const CustomTagsMarker = Symbol("CustomTags");

const NameOption: Option = {
    name: "name",
    description: "The name of the tag",
    type: ApplicationCommandOptionType.STRING,
    required: true
};

interface CustomTag {
    name: string;
    value: string;
    enabled: boolean;
}

let tags: CustomTag[] = [];

const getTags = () => DataStore.get(DATA_KEY).then<CustomTag[]>(r => r ?? []);
const saveTags = () => DataStore.set(DATA_KEY, tags);

function handleTagDelete(name: string) {
    if (mSettings.mode === "top") {
        unregisterCommand(name);
    }
}

function registerTag({ name, value }: CustomTag) {
    registerCommand({
        name,
        description: `CustomTags: Execute the tag ${name}`,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        execute: () => ({ content: value }),
        [CustomTagsMarker]: true,
    }, "CustomTags");
}

function handleTagCreate(tag: CustomTag) {
    if (mSettings.mode === "top") {
        registerTag(tag);
    }
}

async function doCommandRegistry(initial = false) {
    tags = await getTags();

    if (mSettings.mode !== "top") {
        if (initial) return;

        // Loop from the back to not have to worry about elements shifting
        for (let i = BUILT_IN.length - 1; i >= 0; i--) {
            const cmd = BUILT_IN[i];
            if (CustomTagsMarker in cmd) {
                delete commands[cmd.name];
                BUILT_IN.splice(i, 1);
            }
        }
        tags = [];
        return;
    }

    for (const tag of tags) if (tag.enabled) {
        registerTag(tag);
    }
}

function tagIndex(name: string) {
    return tags.findIndex(t => t.name === name);
}

export default definePlugin({
    name: "CustomTags",
    description: "Create custom tags / commands",
    authors: [Devs.Ven],
    dependencies: ["CommandsAPI"],

    options: {
        mode: {
            type: OptionType.SELECT,
            description: "How do you want to run tags?",
            onChange: doCommandRegistry,
            options: [
                {
                    label: "Run tags via /tag TagName",
                    value: "grouped",
                    default: true
                },
                {
                    label: "Run tags via /TagName",
                    value: "top"
                }
            ]
        }
    },

    start() {
        doCommandRegistry(true);
    },

    commands: [
        {
            name: "tag",
            description: "Manage or run your custom tags",
            inputType: ApplicationCommandInputType.BUILT_IN,

            get options() {
                const options: Option[] = [
                    {
                        name: "create",
                        description: "Create a new tag",
                        type: ApplicationCommandOptionType.SUB_COMMAND,
                        options: [
                            NameOption,
                            {
                                name: "value",
                                description: "The text to send when this tag is invoked",
                                type: ApplicationCommandOptionType.STRING,
                                required: true
                            }
                        ]
                    },
                    {
                        name: "delete",
                        description: "Delete a tag",
                        type: ApplicationCommandOptionType.SUB_COMMAND,
                        options: [NameOption]
                    },
                    {
                        name: "list",
                        description: "List all tag",
                        type: ApplicationCommandOptionType.SUB_COMMAND,
                        options: []
                    }
                ];

                if (mSettings.mode === "grouped") {
                    for (const { name, enabled, value } of tags) if (enabled) {
                        options.push({
                            name,
                            description: value.slice(0, 200),
                            type: ApplicationCommandOptionType.SUB_COMMAND
                        });
                    }
                }

                return options.map(prepareOption);
            },

            async execute(args, ctx) {
                const { name, options } = args[0];
                let res: string;
                switch (name) {
                    case "create": {
                        const name = findOption(options, "name", "");
                        const value = findOption(options, "value", "");
                        if (tagIndex(name) !== -1) {
                            res = `A tag with name ${name} already exists!`;
                        } else {
                            const newTag = {
                                name,
                                enabled: true,
                                value
                            };
                            tags.push(newTag);
                            handleTagCreate(newTag);
                            await saveTags();
                            res = `Successfully added tag \`${name}\``;
                        }
                        break;
                    }
                    case "delete": {
                        const name = findOption(options, "name", "");
                        const idx = tagIndex(name);
                        if (idx !== -1) {
                            tags.splice(idx, 1);
                            handleTagDelete(name);
                            await saveTags();
                            res = `Successfully deleted tag \`${name}\``;
                        } else {
                            res = `No such tag: \`${name}\``;
                        }
                        break;
                    }
                    case "list":
                        res = "**Tags:**\n\n";
                        res += tags
                            .map(({ name, value }) => `\`${name}\`: ${value.slice(0, 200)}`)
                            .join("\n") || "You have no tags. Try registering some with /tag create!";
                        break;
                    default:
                        sendMessage(ctx.channel.id, {
                            content: tags[tagIndex(name)].value
                        });
                        return;
                }
                sendBotMessage(ctx.channel.id, {
                    content: res
                });
            },
        }
    ]
});
