import definePlugin from "../utils/types";
import { Devs } from '../utils/constants';

export default definePlugin({
    name: "NoTrack",
    description: "Disable Discord's tracking and crash reporting",
    authors: [Devs.Cyn],
    required: true,
    patches: [
        {
            find: "TRACKING_URL:",
            replacement: {
                match: /^.+$/,
                replace: "()=>{}",
            },
        },
        {
            find: "window.DiscordSentry=",
            replacement: {
                match: /window\.DiscordSentry=function.+\}\(\)/,
                replace: "",
            }
        }
    ]
});
