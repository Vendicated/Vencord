import definePlugin from "../utils/types";
import { ApplicationCommandInputType, OptionalMessageOption, sendBotMessage, findOption, RequiredMessageOption } from "../api/Commands";
import { Devs } from "../utils/constants";


function mock(input): string {
    let output = "";
    for (const i of input.toLowerCase()) {
        if (i.match(/^[A-Z]+$/i) && Math.random() < 0.4) {
            output += i.toUpperCase();
        } else {
            output += i;
        }
    }
    return output;
}
export default definePlugin({
    name: "MoreCommands",
    description: "echo, lenny, mock",
    authors: [
        Devs.Arjix,
        Devs.echo,
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
        {
            name: "mock",
            description: "mOcK peOpLE",
            options: [RequiredMessageOption],
            execute: opts => ({
                content: mock(findOption(opts, "message", ""))
            }),
        },
    ]
});
