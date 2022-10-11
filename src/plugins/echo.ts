import definePlugin from "../utils/types";
import { ApplicationCommandInputType, sendBotMessage, findOption, OptionalMessageOption } from "../api/Commands";

export default definePlugin({
    name: "Echo",
    description: "Uses Clydes message function to send a custom message of your choice (locally)",
    authors: [{ name: "ICodeInAssembly", id: 702973430449832038n }],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "echo",
            description: "Sends a message as Clyde (locally)",
            options: [OptionalMessageOption],
            inputType: ApplicationCommandInputType.BOT,
            execute: (opts, ctx) => {
                const message = findOption(opts, "message", "");

                sendBotMessage(ctx.channel.id, message); // 970775660673007696, "testing testicles", [], "test"
            },
        },
    ]
});
