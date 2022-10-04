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
    helloWorld: {
        name: "hello world",
        description: "Sends 'Hello world!'",
        type: ApplicationCommandType.CHAT_INPUT,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        execute: () => ({ content: "Hello world!" }),
    } as Command,
    start() {
        registerCommand(this.helloWorld);
    },

    stop() {
        unregisterCommand(this.helloWorld);
    },
});
