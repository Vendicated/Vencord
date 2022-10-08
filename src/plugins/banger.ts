import definePlugin from "../utils/types";
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
                replace: 'src: "https://i.imgur.com/wp5q52C.mp4"'
            }
        }
    ],
});
