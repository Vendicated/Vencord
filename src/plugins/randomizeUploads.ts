import definePlugin from "../utils/types";

export default definePlugin({
    name: "randomizeUpload",
    authors: [
        {
            name: "obscurity",
            id: 336678828233588736n,
        },
    ],
    description: "Randomize uploaded file names",
    patches: [
        {
            find: "instantBatchUpload:function",
            replacement: {
                match: /uploadFiles:(.{1,2}),/,
                replace:
                    "uploadFiles: (...args) => (args[0].uploads.forEach((f) => {f.filename = Vencord.Plugins.plugins.randomizeUpload.rand(f.filename)}), $1(...args)),",
            },
        },
    ],

    rand(file) {
        const chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const rand = Array.from(
            { length: 7 },
            () => chars[Math.floor(Math.random() * chars.length)]
        ).join("");
        let res = rand + window.DiscordNative.fileManager.extname(file);
        return res;
    },
});
