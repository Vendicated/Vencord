import definePlugin from "../utils/types";

export default definePlugin({
    name: "Nop Spammer",
    description: "makes the hidden from likely spammer tag explode",
    author: "Animal",
    patches: [{
        find: "isSpam=",
        replacement: {
            match: /\.isSpam=.;/,
            replace: ".isSpam=false;",
        }
    }]
});
