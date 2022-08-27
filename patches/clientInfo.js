module.exports = {
    name: "ClientInfo",
    patches: [{
        find: "default.versionHash",
        replacement: {
            match: /\w\.createElement.+?["']Host ["'].+?\):null/,
            replace: m => {
                const idx = m.indexOf("Host") - 1;
                return `${m},${m.slice(0, idx)}"Vencord ","1.0.0")," ")`
            }
        }
    }]
};
