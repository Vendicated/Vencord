import definePlugin from "../utils/types";

export default definePlugin({
    name: "MuteNewGuild",
    description: "Mutes newly joined guilds",
    authors: [{
        name:"Glitchy",
        id: 269567451199569920n
    }],
    patches: [
        {
            find: "acceptInvite:function",
            replacement: {
                match: /(\w=null!==[^;]+)/,
                replace: "$1;Vencord.Webpack.findByProps('updateGuildNotificationSettings').updateGuildNotificationSettings($1,{'muted': true, 'suppress_everyone': true, 'suppress_roles': true})"
            }
        }
    ],
})
