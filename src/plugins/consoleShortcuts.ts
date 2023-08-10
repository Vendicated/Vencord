/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { relaunch } from "@utils/native";
import { canonicalizeMatch, canonicalizeReplace, canonicalizeReplacement } from "@utils/patches";
import definePlugin from "@utils/types";
import * as Webpack from "@webpack";
import { extract, filters, findAll, search } from "@webpack";
import { React, ReactDOM } from "@webpack/common";
import type { ComponentType } from "react";

const WEB_ONLY = (f: string) => () => {
    throw new Error(`'${f}' is Discord Desktop only.`);
};

export default definePlugin({
    name: "ConsoleShortcuts",
    description: "Adds shorter Aliases for many things on the window. Run `shortcutList` for a list.",
    authors: [Devs.Ven],

    getShortcuts() {
        function newFindWrapper(filterFactory: (...props: any[]) => Webpack.FilterFn) {
            const cache = new Map<string, unknown>();

            return function (...filterProps: unknown[]) {
                const cacheKey = String(filterProps);
                if (cache.has(cacheKey)) return cache.get(cacheKey);

                const matches = findAll(filterFactory(...filterProps));

                const result = (() => {
                    switch (matches.length) {
                        case 0: return null;
                        case 1: return matches[0];
                        default:
                            const uniqueMatches = [...new Set(matches)];
                            if (uniqueMatches.length > 1)
                                console.warn(`Warning: This filter matches ${matches.length} modules. Make it more specific!\n`, uniqueMatches);

                            return matches[0];
                    }
                })();
                if (result && cacheKey) cache.set(cacheKey, result);
                return result;
            };
        }

        let fakeRenderWin: WeakRef<Window> | undefined;
        return {
            wp: Vencord.Webpack,
            wpc: Webpack.wreq.c,
            wreq: Webpack.wreq,
            wpsearch: search,
            wpex: extract,
            wpexs: (code: string) => Vencord.Webpack.extract(Vencord.Webpack.findModuleId(code)!),
            find: newFindWrapper(f => f),
            findAll,
            findByProps: newFindWrapper(filters.byProps),
            findAllByProps: (...props: string[]) => findAll(filters.byProps(...props)),
            findByCode: newFindWrapper(filters.byCode),
            findAllByCode: (code: string) => findAll(filters.byCode(code)),
            findStore: newFindWrapper(filters.byStoreName),
            PluginsApi: Vencord.Plugins,
            plugins: Vencord.Plugins.plugins,
            React,
            Settings: Vencord.Settings,
            Api: Vencord.Api,
            reload: () => location.reload(),
            restart: IS_WEB ? WEB_ONLY("restart") : relaunch,
            canonicalizeMatch,
            canonicalizeReplace,
            canonicalizeReplacement,
            fakeRender: (component: ComponentType, props: any) => {
                const prevWin = fakeRenderWin?.deref();
                const win = prevWin?.closed === false ? prevWin : window.open("about:blank", "Fake Render", "popup,width=500,height=500")!;
                fakeRenderWin = new WeakRef(win);
                win.focus();

                ReactDOM.render(React.createElement(component, props), win.document.body);
            }
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
