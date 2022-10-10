import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "isStaff",
    description:
        "Gives access to client devtools & other things locked behind isStaff",
    authors: [Devs.Megu],
    patches: [
        {
            find: ".isStaff=function(){",
            replacement: [
                {
                    match: /(\w+)\.isStaff=function\(\){return\s*!1};/,
                    replace: "$1.isStaff=function(){return $1.id === Vencord.Webpack.Common.UserStore.getCurrentUser().id};",
                },
                {
                    match: /return\s*(\w+)\.hasFlag\(.+?STAFF\)}/,
                    replace: "if($1.id === Vencord.Webpack.Common.UserStore.getCurrentUser().id){return true};return $1.hasFlag.STAFF}",
                },
                {
                    match: /hasFreePremium=function\(\){return this.isStaff\(\)\s*\|\|/,
                    replace: "hasFreePremium=function(){return ",
                },
            ],
        },
    ],
});
