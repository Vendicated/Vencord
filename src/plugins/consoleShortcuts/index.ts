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
import { getCurrentChannel, getCurrentGuild } from "@utils/discord";
import { SYM_LAZY_CACHED, SYM_LAZY_GET } from "@utils/lazy";
import { SYM_LAZY_COMPONENT_INNER } from "@utils/lazyReact";
import { relaunch } from "@utils/native";
import { canonicalizeMatch, canonicalizeReplace, canonicalizeReplacement } from "@utils/patches";
import { SYM_PROXY_INNER_GET, SYM_PROXY_INNER_VALUE } from "@utils/proxyInner";
import definePlugin, { PluginNative, StartAt } from "@utils/types";
import * as Webpack from "@webpack";
import { cacheFindAll, cacheFindModuleId, extract, filters, searchFactories } from "@webpack";
import * as Common from "@webpack/common";
import { loadLazyChunks } from "debug/loadLazyChunks";
import type { ComponentType } from "react";

const DESKTOP_ONLY = (f: string) => () => {
    throw new Error(`'${f}' is Discord Desktop only.`);
};


type Define = typeof Object.defineProperty;
const define: Define = (target, p, attributes) => {
    if (Object.hasOwn(attributes, "value")) {
        attributes.writable = true;
    }

    return Object.defineProperty(target, p, {
        configurable: true,
        enumerable: true,
        ...attributes
    });
};

function makeShortcuts() {
    function newFindWrapper(filterFactory: (...props: any[]) => Webpack.FilterFn, shouldReturnFactory = false) {
        const cache = new Map<string, unknown>();

        return function (...filterProps: unknown[]) {
            const cacheKey = String(filterProps);
            if (cache.has(cacheKey)) return cache.get(cacheKey);

            const matches = cacheFindAll(filterFactory(...filterProps), shouldReturnFactory);

            const result = (() => {
                switch (matches.length) {
                    case 0: return null;
                    case 1: return matches[0];
                    default:
                        const uniqueMatches = [...new Set(matches)];
                        if (uniqueMatches.length > 1) {
                            console.warn(`Warning: This filter matches ${matches.length} modules. Make it more specific!\n`, uniqueMatches);
                        }

                        return uniqueMatches[0];
                }
            })();

            if (result && cacheKey) cache.set(cacheKey, result);
            return result;
        };
    }

    let fakeRenderWin: WeakRef<Window> | undefined;

    const find = newFindWrapper(f => f);
    const findByProps = newFindWrapper(filters.byProps);

    return {
        wp: Webpack,
        wpc: { getter: () => Webpack.cache },
        wreq: { getter: () => Webpack.wreq },

        WebpackInstances: { getter: () => Vencord.WebpackPatcher.allWebpackInstances },
        loadLazyChunks: IS_DEV ? loadLazyChunks : () => { throw new Error("loadLazyChunks is dev only."); },

        wpsearch: searchFactories,
        wpex: extract,
        wpexs: (...code: Webpack.CodeFilter) => extract(cacheFindModuleId(...code)!),

        filters,
        find,
        findAll: cacheFindAll,
        findComponent: find,
        findAllComponents: cacheFindAll,
        findExportedComponent: (...props: Webpack.PropsFilter) => findByProps(...props)[props[0]],
        findComponentByCode: newFindWrapper(filters.componentByCode),
        findAllComponentsByCode: (...code: Webpack.PropsFilter) => cacheFindAll(filters.componentByCode(...code)),
        findComponentByFields: newFindWrapper(filters.componentByFields),
        findAllComponentsByFields: (...fields: Webpack.PropsFilter) => cacheFindAll(filters.componentByFields(...fields)),
        findByProps,
        findAllByProps: (...props: Webpack.PropsFilter) => cacheFindAll(filters.byProps(...props)),
        findProp: (...props: Webpack.PropsFilter) => findByProps(...props)[props[0]],
        findByCode: newFindWrapper(filters.byCode),
        findAllByCode: (code: Webpack.CodeFilter) => cacheFindAll(filters.byCode(...code)),
        findStore: newFindWrapper(filters.byStoreName),
        findByFactoryCode: newFindWrapper(filters.byFactoryCode),
        findAllByFactoryCode: (...code: Webpack.CodeFilter) => cacheFindAll(filters.byFactoryCode(...code)),
        findModuleFactory: newFindWrapper(filters.byFactoryCode, true),
        findAllModuleFactories: (...code: Webpack.CodeFilter) => cacheFindAll(filters.byFactoryCode(...code), true),

        plugins: { getter: () => Vencord.Plugins.plugins },
        PluginsApi: { getter: () => Vencord.Plugins },
        Settings: { getter: () => Vencord.Settings },
        Api: { getter: () => Vencord.Api },
        Util: { getter: () => Vencord.Util },

        reload: () => location.reload(),
        restart: IS_WEB ? DESKTOP_ONLY("restart") : relaunch,

        canonicalizeMatch,
        canonicalizeReplace,
        canonicalizeReplacement,

        preEnable: (plugin: string) => (Vencord.Settings.plugins[plugin] ??= { enabled: true }).enabled = true,
        fakeRender: (component: ComponentType, props: any) => {
            const prevWin = fakeRenderWin?.deref();
            const win = prevWin?.closed === false
                ? prevWin
                : window.open("about:blank", "Fake Render", "popup,width=500,height=500")!;
            fakeRenderWin = new WeakRef(win);
            win.focus();

            const doc = win.document;
            doc.body.style.margin = "1em";

            if (!win.prepared) {
                win.prepared = true;

                [...document.querySelectorAll("style"), ...document.querySelectorAll("link[rel=stylesheet]")].forEach(s => {
                    const n = s.cloneNode(true) as HTMLStyleElement | HTMLLinkElement;

                    if (s.parentElement?.tagName === "HEAD")
                        doc.head.append(n);
                    else if (n.id?.startsWith("vencord-") || n.id?.startsWith("vcd-"))
                        doc.documentElement.append(n);
                    else
                        doc.body.append(n);
                });
            }

            Common.ReactDOM.render(Common.React.createElement(component, props), doc.body.appendChild(document.createElement("div")));
        },

        channel: { getter: () => getCurrentChannel(), preload: false },
        channelId: { getter: () => Common.SelectedChannelStore.getChannelId(), preload: false },
        guild: { getter: () => getCurrentGuild(), preload: false },
        guildId: { getter: () => Common.SelectedGuildStore.getGuildId(), preload: false },
        me: { getter: () => Common.UserStore.getCurrentUser(), preload: false },
        meId: { getter: () => Common.UserStore.getCurrentUser().id, preload: false },
        messages: { getter: () => Common.MessageStore.getMessages(Common.SelectedChannelStore.getChannelId()), preload: false },

        ...Object.fromEntries(Object.keys(Common).map(key => [key, { getter: () => Common[key] }])),
        Stores: {
            getter: () => Object.fromEntries(
                Common.Flux.Store.getAll()
                    .map(store => [store.getName(), store] as const)
                    .filter(([name]) => name.length > 1)
            )
        }
    };
}

function loadAndCacheShortcut(key: string, val: any, forceLoad: boolean) {
    const currentVal = val.getter();
    if (!currentVal || val.preload === false) return currentVal;

    function unwrapProxy(value: any) {
        if (value[SYM_LAZY_GET]) {
            return forceLoad ? value[SYM_LAZY_GET]() : value[SYM_LAZY_CACHED];
        } else if (value[SYM_PROXY_INNER_GET]) {
            return forceLoad ? value[SYM_PROXY_INNER_GET]() : value[SYM_PROXY_INNER_VALUE];
        } else if (value[SYM_LAZY_COMPONENT_INNER]) {
            return value[SYM_LAZY_COMPONENT_INNER]() != null ? value[SYM_LAZY_COMPONENT_INNER]() : value;
        }

        return value;
    }

    const value = unwrapProxy(currentVal);
    if (value != null && typeof value === "object") {
        const descriptors = Object.getOwnPropertyDescriptors(value);

        for (const propKey in descriptors) {
            if (value[propKey] == null) continue;

            const descriptor = descriptors[propKey];
            if (descriptor.writable === true || descriptor.set != null) {
                const currentValue = value[propKey];
                const newValue = unwrapProxy(currentValue);
                if (newValue != null && currentValue !== newValue) {
                    value[propKey] = newValue;
                }
            }
        }
    }

    if (value != null) {
        define(window.shortcutList, key, { value });
    }

    return value;
}

export default definePlugin({
    name: "ConsoleShortcuts",
    description: "Adds shorter Aliases for many things on the window. Run `shortcutList` for a list.",
    authors: [Devs.Ven],

    startAt: StartAt.Init,
    start() {
        const shortcuts = makeShortcuts();
        window.shortcutList = {};

        for (const key in shortcuts) {
            const val = shortcuts[key];

            if (Object.hasOwn(val, "getter")) {
                define(window.shortcutList, key, {
                    get: () => loadAndCacheShortcut(key, val, true)
                });

                define(window, key, {
                    get: () => window.shortcutList[key]
                });
            } else {
                window.shortcutList[key] = val;
                window[key] = val;
            }
        }

        // Unproxy loaded modules
        Webpack.onceDiscordLoaded.then(() => {
            setTimeout(() => this.eagerLoad(false), 1000);

            if (!IS_WEB) {
                const Native = VencordNative.pluginHelpers.ConsoleShortcuts as PluginNative<typeof import("./native")>;
                Native.initDevtoolsOpenEagerLoad();
            }
        });
    },

    async eagerLoad(forceLoad: boolean) {
        await Webpack.onceDiscordLoaded;

        const shortcuts = makeShortcuts();
        for (const key in shortcuts) {
            const val = shortcuts[key];

            if (!Object.hasOwn(val, "getter") || val.preload === false) continue;
            try {
                loadAndCacheShortcut(key, val, forceLoad);
            } catch { } // swallow not found errors in DEV
        }
    },

    stop() {
        delete window.shortcutList;
        for (const key in makeShortcuts()) {
            delete window[key];
        }
    }
});
