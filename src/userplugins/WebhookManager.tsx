/*
    Vencord is very swag
*/

import definePlugin from "@utils/types";
import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage, findOption } from "@api/Commands";
import { Devs } from "@utils/constants";
import { RestAPI } from "@webpack/common";


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
                try {
                    await RestAPI.delete({
                        url: "" + findOption(option, "url")
                    });
                    sendBotMessage(ctx.channel.id, {
                        content: "Webhook deleted successfully."
                    });
                }
                catch
                {
                    sendBotMessage(ctx.channel.id, {
                        content: "Webhook NOT deleted successfully."
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
                var webhookthing = findOption(option, "url");
                await fetch("" + webhookthing).then(response => response.json())
                    .then(response => {
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
                                "Creator UserID: " + response.user.id + "\n" +
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
                },
                {
                    name: "tts",
                    description: "Send message with TTS?",
                    type: ApplicationCommandOptionType.BOOLEAN,
                    required: false
                }
            ],
            execute: async (option, ctx) => {
                const request = new XMLHttpRequest();
                request.open("POST", "" + findOption(option, "url"));
                request.setRequestHeader('Content-type', 'application/json');

                const headers: Record<string, string> = {
                    "Accept": "application/json",
                    "Accept-Language": "en",
                };

                const params = {
                    content: "" + findOption(option, "message"),
                };

                request.send(JSON.stringify(params));

                sendBotMessage(ctx.channel.id, {
                    content: "Message sent successfully!"
                });
            }
        }
    ]
});