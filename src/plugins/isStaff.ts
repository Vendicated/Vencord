import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "isStaff",
    description: "Gives access to client devtools & other things locked behind isStaff",
    authors: [
        Devs.Megu
    ],
    patches: [
        {
            find: ".isStaff=function(){",
            replacement: [{
                match: /(\w+)\.isStaff=function\(\){return\s*!1};/,
                replace: "$1.isStaff=function(){return true};",
            }, {
                match: /return\s\w+\.hasFlag.+?}/,
                replace: "return true}",
            }],
        },
    ],
});
