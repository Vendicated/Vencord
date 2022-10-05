import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "CommandsAPI",
    authors: [Devs.Arjix],
    description: "Api required by anything that uses commands",
    patches: [
        {
            find: `"giphy","tenor"`,
            replacement: [
                {
                    // Matches BUILT_IN_COMMANDS. This is not exported so this is
                    // the only way. _init() just returns the same object to make the
                    // patch simpler, the resulting code is x=Vencord.Api.Commands._init(y).filter(...)
                    match: /(?<=\w=)(\w)(\.filter\(.{0,30}giphy)/,
                    replace: "Vencord.Api.Commands._init($1)$2",
                }
            ],
        }
    ],
});
