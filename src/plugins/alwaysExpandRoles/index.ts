import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "AlwaysExpandRoles",
    description: "Always expands the role list in profile popouts",
    authors: [Devs.surgedevs],
    patches: [
        {
            find: "action:\"EXPAND_ROLES\"",
            replacement: {
                match: /(let\s+\i=\d+===\i\?\i:)\d+;/,
                replace: "$1Number.MAX_VALUE;"
            }
        }
    ]
});
