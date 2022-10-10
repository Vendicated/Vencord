import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "MuteNewGuild",
    description: "Mutes newly joined guilds",
    authors: [Devs.Glitch],
    patches: [
        {
            find: ",acceptInvite:function",
            replacement: {
                match: /(\w=null!==[^;]+)/,
                replace: "$1;Bencord.Webpack.findByProps('updateGuildNotificationSettings').updateGuildNotificationSettings($1,{'muted':true,'suppress_everyone':true,'suppress_roles':true})"
            }
        }
    ],
});
