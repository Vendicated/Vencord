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
                match: /uploadFiles:(.)/,
                replace:
                    "uploadFiles: (...args) => (args[0].uploads.forEach((f) => {f.filename = Vencord.Plugins.plugins.randomizeUpload.rand(f.filename)}), $1(...args))",
            },
        },
    ],

    rand(file) {
        let res = "";
        const chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < 7; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        res += window.DiscordNative.fileManager.extname(file);
        return res;
    },
});
