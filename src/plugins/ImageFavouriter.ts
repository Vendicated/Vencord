import definePlugin from "@utils/types";

export default definePlugin({
    name: "ImageFavouriter",
    description: "Adds the favourite button to all kinds of media.",
    authors: [
        {
            id: 834469760686489620n,
            name: "NavaShield",
        },
    ],
    patches: [],
    start() {
        (RegExp as any)._test ??= RegExp.prototype.test;
        RegExp.prototype.test = function(str) { return ((RegExp as any)._test as Function).call(this.source === "\\.gif($|\\?|#)" ? /\.(gif|png|jpe?g|webp)($|\?|#)/i : this, str); }
    },
    stop() {
        RegExp.prototype.test = (RegExp as any)._test;
        delete (RegExp as any)._test;
    },
});