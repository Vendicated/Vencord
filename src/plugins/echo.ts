import definePlugin from "../utils/types";
import { ApplicationCommandInputType, sendBotMessage, findOption, OptionalMessageOption } from "../api/Commands";
import { ReactionEmoji, Message, MessageReaction, JSMessage } from "discord-types/general";

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

                sendBotMessage(ctx.channel.id, { content: message });
            },
        },
    ]
});
