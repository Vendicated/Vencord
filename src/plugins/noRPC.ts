import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "No RPC",
    description: "Disables Discord's RPC server.",
    authors: [Devs.Cyn],
    patches: [
        {
            find: '.ensureModule("discord_rpc")',
            replacement: {
                match: /\.ensureModule\("discord_rpc"\)\.then\(\(.+?\)\)}/,
                replace: '.ensureModule("discord_rpc")}',
            },
        },
    ],
});
