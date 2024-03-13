/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { RestAPI } from "@webpack/common";

export let webhookDefaultName;
export let webhookUrlGLOBAL;
export let webhookMessageGLOBAL;
const Native = VencordNative.pluginHelpers.WebhookManager as PluginNative<typeof import("./native")>;

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
                    if (res.ok === true) {
                        sendBotMessage(ctx.channel.id, {
                            content: "Webhook deleted successfully."
                        });
                    }
                    else {
                        console.log("WebhookManager encountered an error deleting a webhook. " + res.status);
                        sendBotMessage(ctx.channel.id, {
                            content: "There was an error deleting the webhook. Check the console for more info."
                        });
                    }
                }
                catch (error) {
                    console.log("WebhookManager encountered an error deleting a webhook. " + error);
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
                var webhookUrl = findOption(option, "url");
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
                                "Creator Username: " + response.username + " | ( <@" + response.user.id + "> )" + "\n " +
                                "Creator Profile: [Click Me](https://img.discord.dog/" + response.user.id + ") \n"
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
                }
                /*
                {
                    name: "username",
                    description: "Give the webhook a custom name (Leave blank for default).",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
                */

            ],
            execute: async (option, ctx) => {

                var webhookUrl = findOption(option, "url");
                var webhookMessage = findOption(option, "message");
                //   var webhookUsername = findOption(option, "username");
                webhookUrlGLOBAL = webhookUrl;
                webhookMessageGLOBAL = webhookMessage;
                await fetch("" + webhookUrl).then(response => response.json())
                    .then(response => {
                        webhookDefaultName = response.name;
                    });

                Native.executeWebhook("" + webhookUrl, {
                    content: webhookMessage,
                    username: webhookDefaultName,
                    avatar_url: ""
                });

                sendBotMessage(ctx.channel.id, {
                    content: "Message sent successfully."
                });

            }
        }
    ]
});
