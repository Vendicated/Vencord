import definePlugin from "@utils/types";

export default definePlugin({
    name: "BoringVC",
    description: "Disables voice channel per-sever avatars and names",
    authors: [{
        name: "Bartkk",
        id: 277910722380562432n
    }],
    patches: [
        // Hide vc avatars
        {
            find: "}getAvatarURL",
            replacement: {
                match: /this.guildMemberAvatars\[\i\]/,
                replace: "void 0"
            }
        },

        // Hide vc nicks
        {
            find: "LARGE?38:24",
            replacement: {
                match: /\[null!=\i\?\i:(\i\.\i\.getName\(\i\))/,
                replace: "[$1"
            }
        }
    ]
});

