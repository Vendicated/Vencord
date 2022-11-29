/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

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
            wp: Vencord.Webpack,
            wpc: Vencord.Webpack.wreq.c,
            wreq: Vencord.Webpack.wreq,
            wpsearch: Vencord.Webpack.search,
            wpex: Vencord.Webpack.extract,
            wpexs: (code: string) => Vencord.Webpack.extract(Vencord.Webpack.findModuleId(code)!),
            findByProps: Vencord.Webpack.findByProps,
            find: Vencord.Webpack.find,
            Plugins: Vencord.Plugins,
            React: Vencord.Webpack.Common.React,
            Settings: Vencord.Settings,
            Api: Vencord.Api,
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
