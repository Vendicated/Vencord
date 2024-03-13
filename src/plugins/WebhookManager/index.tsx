/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { RestAPI } from "@webpack/common";
import { Logger } from "@utils/Logger";

const Native = VencordNative.pluginHelpers.WebhookManager as PluginNative<typeof import("./native")>;
const WMLogger = new Logger("WebhookManager");

export default definePlugin({
    name: "WebhookManager",
    description: "Manage your webhooks easily; delete, send messages, get detailed info and more.",
    authors: [Devs.Byron],
    dependencies: ["CommandsAPI"],

    commands: [
        {
            name: "deletewebhook",
            description: "Delete a webhook.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "url",
                    description: "The URL of the webhook.",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
            ],
            execute: async (option, ctx) => {
                const res = await RestAPI.delete({ url: "" + findOption(option, "url") });
                try {
                    if (res.ok) {
                        sendBotMessage(ctx.channel.id, {
                            content: "Webhook deleted successfully."
                        });
                    }
                    else {
                        WMLogger.error("WebhookManager encountered an error deleting a webhook. " + res.status);
                        sendBotMessage(ctx.channel.id, {
                            content: "There was an error deleting the webhook. Check the console for more info."
                        });
                    }
                }
                catch (error) {
                    WMLogger.error("WebhookManager encountered an error deleting a webhook. " + error);
                    sendBotMessage(ctx.channel.id, {
                        content: "There was an error deleting the webhook. Check the console for more info. Did you input a valid webhook URL?"
                    });
                }
            }
        },
        {
            name: "webhookinfo",
            description: "Retrieve information about a webhook.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "url",
                    description: "The URL of the webhook.",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
            ],
            execute: async (option, ctx) => {
                let webhookUrl = findOption(option, "url");
                await fetch("" + webhookUrl).then(response => response.json())
                    .then(response => {
                        console.log(JSON.stringify(response));
                        sendBotMessage(ctx.channel.id, {
                            content: "# Webhook Information:  \n" +
                                "Webhook Username: " + response.name + "\n " +
                                "Webhook ID: " + response.id + "\n " +
                                "Webhook Token: " + response.token + "\n " +
                                "Channel ID: " + response.channel_id + "\n " +
                                "Server ID: " + response.guild_id + "\n " +
                                "Webhook Profile Picture: " + "[Click Me](https://cdn.discordapp.com/avatars/" + response.id + "/" + response.avatar + ".png)" + "\n " +
                                "Webhook Type: " + response.type + "\n \n" +

                                "# Webhook Creator Information: \n " +
                                "Creator UserID: " + response.user.id + "\n " +
                                "Creator Username: " + "<@" + response.user.id + ">" + "\n "
                        });
                    });
            }
        },
        {
            name: "sendwebhookmessage",
            description: "Send a message through a webhook.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "url",
                    description: "The URL of the webhook.",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "message",
                    description: "The message you want to send.",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "username",
                    description: "Give the webhook a custom name (Leave blank for default).",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                },
                {
                    name: "rawjson",
                    description: "Send as a raw JSON",
                    type: ApplicationCommandOptionType.BOOLEAN,
                    required: false
                }

            ],
            execute: async (option, ctx) => {

                let webhookUrl = findOption(option, "url");
                let webhookMessage = findOption(option, "message");
                let webhookUsername = findOption(option, "username");
                if (findOption(option, "rawjson")) {
                    Native.executeWebhook("" + webhookUrl, {
                        webhookMessage // doubt it will work but it might, might clash with other options such as the username, but once i'm home i'll continue testing.
                    });

                }
                else {
                    Native.executeWebhook("" + webhookUrl, {
                        content: webhookMessage,
                        username: webhookUsername ?? fetch("" + webhookUrl).then(response => response.json()), // still may have issues, supposed to go to webhook name if a custom name is not set, ?? should be the right operator
                        avatar_url: ""
                    });
                }


                sendBotMessage(ctx.channel.id, {
                    content: "Message sent successfully."
                });

            }
        }
    ]
});
