import definePlugin from "../utils/types";
import { ApplicationCommandInputType, sendBotMessage, findOption, OptionalMessageOption } from "../api/Commands";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "MoreCommands",
    description: "echo, lenny",
    authors: [
        Devs.Arjix,
        {
            name: "ICodeInAssembly",
            id: 702973430449832038n
        }
    ],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "echo",
            description: "Sends a message as Clyde (locally)",
            options: [OptionalMessageOption],
            inputType: ApplicationCommandInputType.BOT,
            execute: (opts, ctx) => {
                const content = findOption(opts, "message", "");

                sendBotMessage(ctx.channel.id, { content });
            },
        },
        {
            name: "lenny",
            description: "Sends a lenny face",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " ( ͡° ͜ʖ ͡°)"
            }),
        },
    ]
});
