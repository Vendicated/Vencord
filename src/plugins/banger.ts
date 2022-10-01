import definePlugin from "../utils/types";

export default definePlugin({
    name: "BANger",
    description: "Replaces the GIF in the ban dialogue with a custom one.",
    authors: [{
        name: "Xinto",
        id: 423915768191647755n
    }],
    patches: [
        {
            find: "BanConfirm",
            replacement: {
                match: /src:\w\(\d+\)/g,
                replace: 'src: "https://i.imgur.com/wp5q52C.mp4"'
            }
        }
    ],
});
