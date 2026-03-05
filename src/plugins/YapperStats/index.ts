import { definePlugin } from "@api/Plugin";

const phrases = [
    "is cooking", 
    "is yapping", 
    "is frying", 
    "is deep frying the chat",
    "is tweaking",
    "is rethinkin life",
    "is about to drop a banger",
    "is staring at the screen",
    "is locked in",
    "is typing a novel",
    "is definitely yapping"
];

export default definePlugin({
    name: "YapperStats",
    description: "replaces typing labels with better ones lol",
    authors: [{ name: "niti7", id: 344154934029058050n }],
    patches: [
        {
            find: ".Messages.TYPING_STATUS_ONE",
            replacement: {
                match: /\.Messages\.TYPING_STATUS_ONE/,
                replace: (orig) => {
                    const p = phrases[Math.floor(Math.random() * phrases.length)];
                    return `\${$1} ${p}`;
                }
            }
        }
    ]
});
