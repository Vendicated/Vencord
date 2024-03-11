/*

    vencord is cool

*/

import definePlugin from "@utils/types";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage, RequiredMessageOption } from "@api/Commands";
import Devs from "utils/constants";

export default definePlugin({
    name: "WebhookManager",
    description: "Manage your webhooks easily; delete, send messages, get detailed info and more.",
    authors: [Devs.byron],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "deletewebhook",
            description: "Delete a webhook.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    RequiredMessageOption, // will debug when home.
                    name: "url",
                    description: "The URL of the webhook.",
                    type: ApplicationCommandOptionType.STRING,

                    execute: (opts, ctx) => {

                        sendBotMessage(ctx.channel.id, {
                            content: "Hello world! \n " +
                                "This is a string addition and \n, testing."
                        });
                    }
                }
            ],
        },
        {
            name: "webhookinfo",
            description: "Retrieve information about a webhook.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    RequiredMessageOption,
                    name: "url",
                    description: "The URL of the webhook.",
                    type: ApplicationCommandOptionType.STRING,

                    execute: (opts, ctx) => {

                        sendBotMessage(ctx.channel.id, {
                            content: "Hello world! \n " +
                                "This is a string addition and \n, testing."
                        });
                    }
                }
            ],
        }
    ]
});