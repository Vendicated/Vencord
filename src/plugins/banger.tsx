import definePlugin, { OptionType } from "../utils/types";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "BANger",
    description: "Replaces the GIF in the ban dialogue with a custom one.",
    authors: [
        {
            name: "Xinto",
            id: 423915768191647755n
        },
        Devs.Glitch
    ],
    patches: [
        {
            find: "BAN_CONFIRM_TITLE.",
            replacement: {
                match: /src:\w\(\d+\)/g,
                replace: "src: Settings.plugins.BANger.source"
            }
        }
    ],
    options: {
        source: {
            description: "Source to replace ban GIF with (Video or Gif)",
            type: OptionType.STRING,
            default: "https://i.imgur.com/wp5q52C.mp4",
            restartNeeded: true,
        }
    }
});
