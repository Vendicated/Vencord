import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "isStaff",
    description:
        "Gives access to client devtools & other things locked behind isStaff",
    authors: [
        Devs.Megu,
        {
            name: "Nickyux",
            id: 427146305651998721n
        },
        {
            name: "BanTheNons",
            id: 460478012794863637n
        }
    ],
    patches: [
        {
            find: ".isStaff=function(){",
            replacement: [
                {
                    match: /return\s*(\w+)\.hasFlag\((.+?)\.STAFF\)}/,
                    replace: "return Vencord.Webpack.Common.UserStore.getCurrentUser().id===$1.id||$1.hasFlag($2.STAFF)}"
                },
                {
                    match: /hasFreePremium=function\(\){return this.isStaff\(\)\s*\|\|/,
                    replace: "hasFreePremium=function(){return ",
                },
            ],
        },
    ],
});
