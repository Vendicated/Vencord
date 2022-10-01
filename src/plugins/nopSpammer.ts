import definePlugin from "../utils/types";

export default definePlugin({
    name: "Nop Spammer",
    description: "makes the hidden from likely spammer tag explode",
    author: "Animal",
    patches: [{
        find: "),{hasFlag:",
        replacement: {
            match: "(if\(e<=1<<30\)return)",
            replace: "if(e===(1<<20)){return false};$1",
        }
    }]
});
