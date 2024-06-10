/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { ModalContent, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Forms, React, TextInput } from "@webpack/common";
import definePlugin, { PluginNative } from "@utils/types";

const Native = VencordNative.pluginHelpers.WebhookManager as PluginNative<typeof import("./native")>;
let url, message, username, avatarUrl = "";

// TODO: fix webhooks not sending, fix probable undefined when null issue, add sending as raw again (wanted to make it a checkbox but i cant find checkbox)
function WebhookMessageModal(props: ModalProps) {
    return <ModalRoot {...props} size={ModalSize.MEDIUM} className={"wm-send-webhook"} >
        <ModalContent className="wm-send-webhook-content">
            <Forms.FormTitle className={Margins.top20}>Webhook URL</Forms.FormTitle>
            <TextInput
                placeholder={"https://discord.com/api/webhooks/1235349630980722698/QQv06cMyTurEIU8nQsZRQMKxdmnnN6FA8Eaa9zbDqGwqeeACx9UAS6CcnVt7B3v8r8t2"}
                onChange={v => {
                    v = url;
                    console.log(url); // why the FUCK is it undefined.
                }}
            />
            <Forms.FormTitle className={Margins.top20}>Webhook Message</Forms.FormTitle>
            <TextInput
                placeholder={"Hello World!"}
                onChange={v => {
                    v = message;
                }}
            />
            <Forms.FormTitle className={Margins.top20}>Webhook Username</Forms.FormTitle>
            <TextInput
                placeholder={"byeoon"}
                onChange={v => {
                    v = username;
                }}
            />
            <Forms.FormTitle className={Margins.top20}>Webhook Avatar URL</Forms.FormTitle>
            <TextInput
                placeholder={"https://cdn.discordapp.com/emojis/1221015075922513990.png"}
                onChange={v => {
                    v = avatarUrl;
                }}
            />
            <Button
                onClick={() => {
                    Native.executeWebhook(url, {
                        content: message,
                        username: username,
                        avatar_url: avatarUrl
                    });
                }}
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
            async execute(_, ctx) {
                openModal(props => <WebhookMessageModal {...props} />);
                sendBotMessage(ctx.channel.id, {
                    content: "Your webhook message has been executed."
                });
            }
        }
    ]
});
