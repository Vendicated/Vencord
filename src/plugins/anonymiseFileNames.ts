import definePlugin, { OptionType } from "../utils/types";
import { Devs } from "../utils/constants";
import { Settings } from "../Vencord";

enum Methods {
    Random,
    Consistent,
    Timestamp,
}

export default definePlugin({
    name: "AnonymiseFileNames",
    authors: [Devs.obscurity],
    description: "Anonymise uploaded file names",
    patches: [
        {
            find: "instantBatchUpload:function",
            replacement: {
                match: /uploadFiles:(.{1,2}),/,
                replace:
                    "uploadFiles:(...args)=>(args[0].uploads.forEach(f=>f.filename=Vencord.Plugins.plugins.AnonymiseFileNames.anonymise(f.filename)),$1(...args)),",
            },
        },
    ],

    options: {
        method: {
            description: "Anonymising method",
            type: OptionType.SELECT,
            options: [
                { label: "Random Characters", value: Methods.Random, default: true },
                { label: "Consistent", value: Methods.Consistent },
                { label: "Timestamp (4chan-like)", value: Methods.Timestamp },
            ],
        },
        randomisedLength: {
            description: "Random characters length",
            type: OptionType.NUMBER,
            default: 7,
            disabled: () => Settings.plugins.AnonymiseFileNames.method !== Methods.Random,
        },
        consistent: {
            description: "Consistent filename",
            type: OptionType.STRING,
            default: "image",
            disabled: () => Settings.plugins.AnonymiseFileNames.method !== Methods.Consistent,
        },
    },

    anonymise(file: string) {
        let name = "image";
        let ext = file.match(/\..+$/g);
        switch (Settings.plugins.AnonymiseFileNames.method) {
            case Methods.Random:
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                name = Array.from(
                    { length: Settings.plugins.AnonymiseFileNames.randomisedLength },
                    () => chars[Math.floor(Math.random() * chars.length)]
                ).join("");
                break;
            case Methods.Consistent:
                name = Settings.plugins.AnonymiseFileNames.consistent;
                break;
            case Methods.Timestamp:
                // UNIX timestamp in nanos, i could not find a better dependency-less way
                name = `${Math.floor(Date.now() / 1000)}${Math.floor(window.performance.now())}`;
                break;
        }
        return name + ext;
    },
});
