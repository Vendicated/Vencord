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
                    match: /(?<=\w=)(\w)(\.filter\(.{0,30}giphy)/,
                    replace: "Vencord.Api.Commands._init($1)$2",
                }
            ],
        },
    ],
});
