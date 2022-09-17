import definePlugin from "../utils/types";

export default definePlugin({
    name: "goosemod",
    description: "Loads goosemod. Quack.",
    author: "Vendicated, botato",
    async start() {
        const quack = await fetch("https://api.goosemod.com/inject.js")
        (0, eval)(await quack.text());
    },
    async stop() {
        await window.goosemod?.remove();
    },
});
