import definePlugin from "../utils/types";
import { registerCommand, unregisterCommand } from "../api/Commands";
import {
    ApplicationCommandInputType,
    ApplicationCommandType,
    Command,
} from "../api/Commands.d";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "VencordCommands",
    description: "Built-in vencord commands",
    authors: [Devs.Arjix],
    dependencies: ["CommandsAPI"],
    lennyFace: {
        name: "lenny",
        description: "Sends a lenny face.",
        type: ApplicationCommandType.CHAT_INPUT,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        execute: () => ({ content: "( ͡° ͜ʖ ͡°)" }),
    } as Command,
    start() {
        registerCommand(this.lennyFace);
    },

    stop() {
        unregisterCommand(this.lennyFace);
    },
});
