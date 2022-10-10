import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

const WEB_ONLY = (f: string) => () => {
    throw new Error(`'${f}' is Discord Desktop only.`);
};

export default definePlugin({
    name: "ConsoleShortcuts",
    description: "Adds shorter Aliases for many things on the window. Run `shortcutList` for a list.",
    authors: [Devs.Ven],

    getShortcuts() {
        return {
            toClip: IS_WEB ? WEB_ONLY("toClip") : window.DiscordNative.clipboard.copy,
            fromClip: IS_WEB ? WEB_ONLY("fromClip") : window.DiscordNative.clipboard.read,
            wp: Bencord.Webpack,
            wpc: Bencord.Webpack.wreq.c,
            wreq: Bencord.Webpack.wreq,
            wpsearch: Bencord.Webpack.search,
            wpex: Bencord.Webpack.extract,
            findByProps: Bencord.Webpack.findByProps,
            find: Bencord.Webpack.find,
            Plugins: Bencord.Plugins,
            React: Bencord.Webpack.Common.React,
            Settings: Bencord.Settings,
            Api: Bencord.Api,
            reload: () => location.reload(),
            restart: IS_WEB ? WEB_ONLY("restart") : window.DiscordNative.app.relaunch
        };
    },

    start() {
        const shortcuts = this.getShortcuts();
        window.shortcutList = shortcuts;
        for (const [key, val] of Object.entries(shortcuts))
            window[key] = val;
    },

    stop() {
        delete window.shortcutList;
        for (const key in this.getShortcuts())
            delete window[key];
    }
});
