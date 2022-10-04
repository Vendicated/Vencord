import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "CommandsAPI",
    authors: [Devs.Arjix],
    description: "Api required by anything that adds commands.",
    patches: [
        {
            find: `"giphy","tenor"`,
            replacement: [
                {
                    match: /(?<=\w=)(\w)(\.filter\(\(function\(\w\){return\[(?:(?:"\w+?")|,)+\]\.includes)/,
                    replace: (m, v, rest) =>
                        `((()=>Vencord.Api.Commands._BuiltIn=${v})())${rest}`,
                }, // I repeat, this is not exposed in the module
            ],
        },
    ],
});
