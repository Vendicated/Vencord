import definePlugin from "../utils/types";

export default definePlugin({
    name: "Ify",
    description: "Disabes Spotify auto-pausing and premium checks",
    author: "Cynosphere",
    patches: [
        {
            find: '.displayName="SpotifyStore"',
            replacement: {
                match: /\.isPremium=.;/,
                replace: ".isPremium=true;",
            },
        },
        {
            find: '.displayName="SpotifyStore"',
            replacement: ["SPEAKING", "VOICE_STATE_UPDATES", "MEDIA_ENGINE_SET_DESKTOP_SOURCE"].map(event => ({
                match: new RegExp(`${event}:function\\(.\\){.+?}(,|}\\))`),
                replace: (_, ending) => `${event}:function(){}${ending}`,
            })),
        },
    ]
});
