import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";
import { findOption, OptionalMessageOption } from '../api/Commands';

export default definePlugin({
    name: "lenny",
    description: "( ͡° ͜ʖ ͡°)",
    authors: [Devs.Arjix],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "lenny",
            description: "Sends a lenny face",
            options: [OptionalMessageOption],
            execute: (opts) => ({
                content: findOption(opts, "message", "") + " ( ͡° ͜ʖ ͡°)"
            }),
        },
    ]
});
