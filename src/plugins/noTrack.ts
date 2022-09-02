import definePlugin from "../utils/types";

export default definePlugin({
    name: "NoTrack",
    description: "Disable Discord's tracking and crash reporting",
    author: "Cynosphere",
    required: true,
    patches: [
        {
            find: "TRACKING_URL:",
            replacement: {
                match: /=\(0,.\.analyticsTrackingStoreMaker\)/,
                replace: "=(function(){})",
            },
        },
        {
            find: "window.DiscordSentry=",
            replacement: {
                match: /window\.DiscordSentry=\(0,.\.initSentry\)\(\)/,
                replace: "",
            }
        }
    ]
});
