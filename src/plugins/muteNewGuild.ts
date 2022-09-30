import definePlugin from "../utils/types";
import { findByProps } from "../webpack";

export default definePlugin({
    name: "muteNewGuild",
    description: "Mutes newly joined guilds",
    author: "Glitchy",
    patches: [
        {
            find: "acceptInvite:function",
            replacement: {
                match: /(return [a-z]\|\|null==[a-z])/,
                replace: "Vencord.Plugins.plugins.muteNewGuild.muteGuild(a);$1"
            }
        }
    ],

    muteGuild(a) {
        const guildSettings = findByProps("updateGuildNotificationSettings")
        const updateSettings = guildSettings.updateGuildNotificationSettings
        updateSettings(a, {"muted": true, "suppress_everyone": true, "suppress_roles": true})
        }
})
