/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { ModalRoot, ModalSize } from "@utils/modal";
import definePlugin, { PluginNative } from "@utils/types";

const Native = VencordNative.pluginHelpers.WebhookManager as PluginNative<typeof import("./native")>;

// TODO: Create Modal and add stuff
function webhookMessageModal(props: ModalProps) {
    return (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalContent className="wm-send-webhook">

            </ModalContent>
        </ModalRoot>
    );
}


export default definePlugin({
    name: "WebhookManager",
    description: "Manage your webhooks easily; delete, send messages, get detailed info and more.",
    authors: [Devs.Byeoon, Devs.Ven],
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
                try {
                    await fetch(findOption(option, "url", ""), {
                        method: "DELETE"
                    });
                    sendBotMessage(ctx.channel.id, {
                        content: "The webhook has deleted successfully."
                    });
                }
                catch (error) {
                    sendBotMessage(ctx.channel.id, {
                        content: "There was an error deleting the webhook. Did you input a valid webhook URL? Error: " + error
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
                const webhookUrl = findOption(option, "url", "");
                const { user, avatar, name, id, token, type, channel_id, guild_id }
                    = await fetch(webhookUrl).then(res => res.json());

                sendBotMessage(ctx.channel.id, {
                    content: `This webhook was created by ${user?.name}.`,
                    embeds: [
                        {
                            title: "Webhook Information",
                            color: "1323",
                            // @ts-ignore
                            author: {
                                name,
                                url: ""
                            },
                            thumbnail: {
                                url: `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`,
                                proxyURL: `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`,
                                height: 128,
                                width: 128
                            },
                            description: `
                                Webhook ID: ${id}
                                Webhook Token: ${token}
                                Webhook Type: ${type}
                                Channel ID: ${channel_id}
                                Server ID: ${guild_id}
                            `
                        }
                    ]
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
                    name: "content",
                    description: "The message content you want to send",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "username",
                    description: "Send with a custom username",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                },
                {
                    name: "avatar-url",
                    description: "Send with a custom profile picture. You must input a valid image URL.",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                },
                {
                    name: "raw",
                    description: "Send message as raw JSON.",
                    type: ApplicationCommandOptionType.BOOLEAN,
                    required: false
                }
            ],
            async execute(option, ctx) {
                const webhookUrl = findOption(option, "url", "");
                const content = findOption(option, "content", "");
                const avatarUrl = findOption<string>(option, "avatar-url");
                const username = findOption<string>(option, "username");

                if (findOption(option, "raw")) {
                    Native.executeWebhook(webhookUrl, {
                        webhookMessage: content
                    });
                } else {
                    Native.executeWebhook(webhookUrl, {
                        content: content,
                        username: username,
                        avatar_url: avatarUrl
                    });
                }
                sendBotMessage(ctx.channel.id, {
                    content: "Your webhook message has been executed."
                });
            }
        }
    ]
});
