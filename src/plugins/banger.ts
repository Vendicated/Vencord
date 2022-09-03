import definePlugin from "../utils/types";

export default definePlugin({
    name: "BANger",
    description: "Replaces the GIF in the ban dialogue with a custom one.",
    author: "Xinto",
    patches: [
        {
            find: "BanConfirm",
            replacement: {
                match: /src:\w\(\d+\)/g,
                replace: 'src: "https://i.imgur.com/wp5q52C.mp4"'
            }
        }
    ],
})