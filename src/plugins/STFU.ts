import definePlugin from "../utils/types";

export default definePlugin({
    name: "STFU",
    description: "Disabled the fat warning in the DevTools console",
    author: "Vendicated",
    start() {
        window.DiscordNative.window.setDevtoolsCallbacks(null, null);
    }
});