import definePlugin from "../utils/types";

export default definePlugin({
    name: "goosemod",
    description: "Loads goosemod. Quack.",
    author: "Vendicated, botato",
    async start() {
        await fetch("https://raw.githubusercontent.com/GooseMod/GooseMod/dist-dev/index.js")
            .then((res) => res.text())
            .then((0, eval));
    },
    async stop() {
        await window.goosemod?.remove();
    },
});
