/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { PluginNative } from "@utils/types";
import { RestAPI } from "@webpack/common";

const Native = VencordNative.pluginHelpers.WebhookManager as PluginNative<typeof import("./native")>;
const WMLogger = new Logger("WebhookManager");
let sourceGuildGet;
let sourceChannelGet;
export default definePlugin({
    name: "WebhookManager",
    description: "Manage your webhooks easily; delete, send messages, get detailed info and more.",
    authors: [Devs.Byron],
    dependencies: ["CommandsAPI"],

    commands: [
        {
            name: "webhook delete",
            description: "Delete a webhook.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "url",
                    description: "The URL of the webhook",
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
            name: "webhook info",
            description: "Retrieve information about a webhook.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "url",
                    description: "The URL of the webhook",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
            ],
            execute: async (option, ctx) => {
                const webhookUrl = findOption(option, "url");
                await fetch("" + webhookUrl).then(response => response.json())
                    .then(response => {
                        WMLogger.info(JSON.stringify(response));
                        if (response.type === 2) {
                            const sourceGuild = `
                            Source Server ID: ${response.source_guild.id}
                            Source Server Name: ${response.source_guild.name}
                            `;
                            sourceGuildGet = sourceGuild;
                            const sourceChannel = `
                            Source Channel ID: ${response.source_channel.id}
                            Source Channel Name: ${response.source_channel.name}
                            `;
                            sourceChannelGet = sourceChannel;
                        }
                        else {
                            sourceGuildGet = "";
                            sourceChannelGet = "";
                        }
                        sendBotMessage(ctx.channel.id, {
                            content: `This webhook was created by <@${response.user.id}>.`,
                            embeds: [
                                {
                                    // @ts-ignore
                                    title: `Webhook Information`,
                                    color: '#00007d',
                                    author: {
                                        // @ts-ignore
                                        icon_url: `https://cdn.discordapp.com/avatars/${response.id}/${response.avatar}.png`,
                                        proxy_icon_url: `https://cdn.discordapp.com/avatars/${response.id}/${response.avatar}.png`,
                                        name: response.name,
                                        url: ""
                                    },
                                    description: `
                                Webhook ID: ${response.id}
                                Webhook Token: ${response.token}
                                Webhook Type: ${response.type}
                                Channel ID: ${response.channel_id}
                                Server ID: ${response.guild_id}
                                ${sourceGuildGet}
                                ${sourceChannelGet}

                                Creator UserID: ${response.user.id}`
                                }]
                        });
                    });
            }
        },
        {
            name: "webhook send",
            description: "Send a message through a webhook.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "url",
                    description: "The URL of the webhook",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "message",
                    description: "The message you want to send",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "username",
                    description: "Send with a custom webhook username",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "tts",
                    description: "Send with TTS",
                    type: ApplicationCommandOptionType.BOOLEAN,
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
                let webhookUsername = findOption(option, "username");
                if (findOption(option, "rawjson")) {
                    Native.executeWebhook("" + webhookUrl, {
                        webhookMessage
                    });
                }
                else {
                    Native.executeWebhook("" + webhookUrl, {
                        content: webhookMessage,
                        username: webhookUsername ?? fetch("" + webhookUrl).then(response => response.json().then(response => { webhookUsername = response.name; })),
                        avatar_url: "",
                        tts: findOption(option, "tts")
                    });
                }
                sendBotMessage(ctx.channel.id, {
                    content: "Message sent successfully."
                });

            }
        }
    ]
});
