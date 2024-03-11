/*

    vencord is cool

*/

import definePlugin from "@utils/types";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage, RequiredMessageOption } from "@api/Commands";

export default definePlugin({
    name: "WebhookManager",
    description: "Manage your webhooks easily; delete, send messages, get detailed info and more.",
    authors: [{ id: 1, name: "byron", },], // will change ID soon, not home
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "deletewebhook",
            description: "Delete a webhook.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    RequiredMessageOption, // will this work? will debug when home.
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
    ]
});