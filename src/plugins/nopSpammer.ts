import definePlugin from "../utils/types";

export default definePlugin({
    name: "Nop Spammer",
    description: "makes the hidden from likely spammer tag explode",
    authors: [
        {
            name: "botato",
            id: 440990343899643943n,
        },
        {
            name: "Iryis",
            id: 118437263754395652n,
        },
    ],
    patches: [
        {
            find: "),{hasFlag:",
            replacement: {
                match: /(if\(e<=1<<30\)return)/,
                replace: "if(e===(1<<20)){return false};$1",
            },
        },
    ],
});
