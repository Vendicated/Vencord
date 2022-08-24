const fs = require("fs");
const path = require("path");

module.exports.patches = [];
module.exports.plugins = [];

for (const file of fs.readdirSync(__dirname)) {
    if (file !== "index.js") {
        const mod = require(path.join(__dirname, file));
        if (mod.patches) module.exports.patches.push(...mod.patches);
        if (mod.start) module.exports.plugins.push(mod);
    }
}

module.exports.startAll = function () {
    for (const plugin of module.exports.plugins) {
        try {
            plugin.start();
        } catch (err) {
            console.error("Failed to start", plugin.name, err);
        }
    }
};
