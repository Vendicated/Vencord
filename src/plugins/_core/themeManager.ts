/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 dragdotpng and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "Theme manager",
    description: "Manage your themes with commands",
    authors: [Devs.Drag],
    required: true,
    commands: [
        {
            name: "theme",
            description: "Manage your themes",
            inputType: ApplicationCommandInputType.BOT,
            options: [
                {
                    name: "add",
                    description: "Add a theme",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "url",
                            description: "The url of the theme",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                }
            ],
            execute: async (args, ctx) => {
                const subcommand = args[0].name;
                if (subcommand === "add") {
                    const url = args[0].options[0].value.trim();
                    if (url) {
                        Settings.themeLinks = [...new Set([...Settings.themeLinks, url])];
                        console.log(url);

                        return sendBotMessage(ctx.channel.id, {
                            content: "Added theme! " + url
                        });
                    }
                }
            }
        },
        {
            name: "theme",
            description: "Manage your themes",
            inputType: ApplicationCommandInputType.BOT,
            options: [
                {
                    name: "remove",
                    description: "Remove a theme",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "url",
                            description: "The url of the theme",
                            type: ApplicationCommandOptionType.STRING,
                            choices: Settings.themeLinks.map(theme => ({
                                name: theme,
                                value: theme
                            })),
                            required: true
                        }
                    ]
                }
            ],
            execute: async (args, ctx) => {
                const subcommand = args[0].name;
                if (subcommand === "remove") {
                    const url = args[0].options[0].value.trim();
                    if (url) {
                        Settings.themeLinks = Settings.themeLinks.filter(theme => theme !== url);
                        console.log(url);

                        return sendBotMessage(ctx.channel.id, {
                            content: "Removed theme! " + url
                        });
                    }
                }
            }
        },
        {
            name: "theme",
            description: "Manage your themes",
            inputType: ApplicationCommandInputType.BOT,
            options: [
                {
                    name: "list",
                    description: "List your themes",
                    type: ApplicationCommandOptionType.SUB_COMMAND
                }
            ],
            execute: async (args, ctx) => {
                const subcommand = args[0].name;
                if (subcommand === "list") {
                    const themes = Settings.themeLinks;

                    return sendBotMessage(ctx.channel.id, {
                        content: "Your themes: " + themes.join(", ")
                    });
                }
            }
        }
    ],

    start() {
        console.log("Theme manager started");
    },
    stop() {
        console.log("Theme manager stopped");
    }
});
*/
