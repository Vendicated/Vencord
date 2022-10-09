import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "RandomiseFileNames",
    authors: [Devs.obscurity],
    description: "Randomise uploaded file names",
    patches: [
        {
            find: "instantBatchUpload:function",
            replacement: {
                match: /uploadFiles:(.{1,2}),/,
                replace:
                    "uploadFiles:(...args)=>(args[0].uploads.forEach(f=>f.filename=Vencord.Plugins.plugins.RandomiseFileNames.rand(f.filename)),$1(...args)),",
            },
        },
    ],

    rand(file: string) {
        const chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const rand = Array.from(
            { length: 7 },
            () => chars[Math.floor(Math.random() * chars.length)]
        ).join("");
        return rand + (file.lastIndexOf(".") > -1 ? file.slice(file.lastIndexOf(".")) : "");
    },
});
