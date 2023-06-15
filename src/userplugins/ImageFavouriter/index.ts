import definePlugin from "@utils/types";

export default definePlugin({
    name: "ImageFavouriter",
    description: "Adds the favourite button to all kinds of media.",
    authors: [
        {
            id: 239809113125552129,
            name: "Snupai",
        },
    ],
    patches: [],
    start() {
        RegExp._test ??= RegExp.prototype.test;
        RegExp.prototype.test = function(str) { return RegExp._test.call(this.source === "\\.gif($|\\?|#)" ? /\.(gif|png|jpe?g|webp)($|\?|#)/i : this, str); }
    },
    stop() {
        RegExp.prototype.test = RegExp._test;
        delete RegExp._test;
    },
});