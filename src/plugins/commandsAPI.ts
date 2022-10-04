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
                // {
                //     match: /(\w)=(\(.*?\.BUILT_IN)/,
                //     replace: (m, k, rest) => `${k}=Vencord.Api.Commands._BUILTIN_CATEGORIES=${rest}`
                // },
                {
                    match: /(?<=\w=)([A-Za-z])(\.filter\(\(function\(\w\){return\[(?:(?:"\w+?")|,)+\]\.includes)/,
                    replace: (m, v, rest) =>
                        `((()=>Vencord.Api.Commands._BuiltIn=${v})())${rest}`,
                }
            ],
        },
    ],
});
