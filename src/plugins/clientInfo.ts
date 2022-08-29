import definePlugin from "../utils/types";

export default definePlugin({
    name: "ClientInfo",
    description: "Adds extra info to Client Info in settings",
    author: "Vendicated",
    patches: [{
        find: "default.versionHash",
        replacement: {
            match: /\w\.createElement.+?["']Host ["'].+?\):null/,
            replace: m => {
                const idx = m.indexOf("Host") - 1;
                return `${m},${m.slice(0, idx)}"Vencord ".repeat(50),"1.0.0")," ")`;
            }
        }
    }]
});