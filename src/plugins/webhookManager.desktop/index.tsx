/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal, openModalLazy } from "@utils/modal";
import { Button, Forms, React, TextInput } from "@webpack/common";
import definePlugin, { PluginNative } from "@utils/types";

const Native = VencordNative.pluginHelpers.WebhookManager as PluginNative<typeof import("./native")>;

// TODO: Create Modal and add stuff
function WebhookMessageModal(props: ModalProps) {
    return <ModalRoot {...props} size={ModalSize.MEDIUM} className={"wm-send-webhook"} >
        <ModalContent className="wm-send-webhook-content">
            <Forms.FormTitle className={Margins.top20}>Webhook Message</Forms.FormTitle>
            <TextInput
                placeholder={"Hello World!"}
                onChange={v => {
                    // content = value;
                }}
            />
            <Forms.FormTitle className={Margins.top20}>Webhook Username</Forms.FormTitle>
            <TextInput
                placeholder={"byeoon"}
                onChange={v => {
                    // content = value;
                }}
            />
            <Forms.FormTitle className={Margins.top20}>Webhook Avatar URL</Forms.FormTitle>
            <TextInput
                placeholder={"https://cdn.discordapp.com/emojis/1221015075922513990.png"}
                onChange={v => {
                    // content = value;
                }}
            />
            <Button
                onClick={() => { }}
            >Send Webhook</Button>
        </ModalContent>
    </ModalRoot >;
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
                }
            ],
            async execute(option, ctx) {
                const webhookUrl = findOption(option, "url", "");
                const content = findOption(option, "content", "");
                const avatarUrl = findOption<string>(option, "avatar-url");
                const username = findOption<string>(option, "username");

                openModal(props => <WebhookMessageModal {...props} />);

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
