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
                const webhookUrl = findOption(option, "url");
                await fetch("" + webhookUrl).then(response => response.json())
                    .then(response => {
                        WMLogger.info(JSON.stringify(response));
                        sendBotMessage(ctx.channel.id, {
                            embeds: [
                                {
                                    author: {
                                        icon_url: `https://cdn.discordapp.com/avatars/${response.id}/${response.avatar}.png`,
                                    },

                                    content: `# Webhook Information: \n
                                Webhook Username: ${response.name}
                                Webhook ID: ${response.id}
                                Webhook Token: ${response.token}
                                Webhook Type: ${response.type}
                                Channel ID: ${response.channel_id}
                                Server ID: ${response.guild_id}

                                "Creator Profile: <@${response.user.id}>`
                                }]
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
                    description: "Send message as raw JSON",
                    type: ApplicationCommandOptionType.BOOLEAN,
                    required: false
                }

            ],
            execute: async (option, ctx) => {

                const webhookUrl = findOption(option, "url");
                const webhookMessage = findOption(option, "message");
                const webhookUsername = findOption(option, "username");
                if (findOption(option, "rawjson")) {
                    Native.executeWebhook("" + webhookUrl, {
                        webhookMessage
                    });

                }
                else {
                    Native.executeWebhook("" + webhookUrl, {
                        content: webhookMessage,
                        username: webhookUsername ?? fetch("" + webhookUrl).then(response => response.json()),
                        avatar_url: ""
                    });
                }


                sendBotMessage(ctx.channel.id, {
                    content: "Message sent successfully."
                });

            }
        }
    ]
});;;;;
