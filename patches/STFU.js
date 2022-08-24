module.exports = {
    name: "STFU",
    start() {
        DiscordNative.window.setDevtoolsCallbacks(null, null);
    }
};
