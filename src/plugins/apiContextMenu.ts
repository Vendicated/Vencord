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

import { Settings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { type PatchReplacement } from "@utils/types";
import { addListener, removeListener } from "@webpack";

/**
 * The last var name corresponding to the Context Menu API (Discord, not ours) module
 */
let lastVarName = "";

/**
 * @param target The patch replacement object
 * @param exportKey The key exporting the build Context Menu component function
 */
function makeReplacementProxy(target: PatchReplacement, exportKey: string) {
    return new Proxy(target, {
        get(_, p) {
            if (p === "match") return RegExp(`${exportKey},{(?<=${lastVarName}\\.${exportKey},{)`, "g");
            // @ts-expect-error
            return Reflect.get(...arguments);
        }
    });
}

function listener(exports: any, id: number) {
    if (!Settings.plugins.ContextMenuAPI.enabled) return removeListener(listener);

    if (typeof exports !== "object" || exports === null) return;

    for (const key in exports) if (key.length <= 3) {
        const prop = exports[key];
        if (typeof prop !== "function") continue;

        const str = Function.prototype.toString.call(prop);
        if (str.includes('path:["empty"]')) {
            Vencord.Plugins.patches.push({
                plugin: "ContextMenuAPI",
                all: true,
                noWarn: true,
                find: "navId:",
                replacement: [
                    {
                        // Set the lastVarName for our proxy to use
                        match: RegExp(`${id}(?<=(\\i)=.+?)`),
                        replace: (id, varName) => {
                            lastVarName = varName;
                            return id;
                        }
                    },
                    /**
                     * We are using a proxy here to utilize the whole code the patcher gives us, instead of matching the entire module (which is super slow)
                     * Our proxy returns the corresponding match for that module utilizing lastVarName, which is set by the patch before
                     */
                    makeReplacementProxy({
                        match: "", // Needed to canonicalizeDescriptor
                        replace: "$&contextMenuApiArguments:arguments,",
                    }, key)
                ]
            });

            removeListener(listener);
        }
    }
}

addListener(listener);

export default definePlugin({
    name: "ContextMenuAPI",
    description: "API for adding/removing items to/from context menus.",
    authors: [Devs.Nuckyz],
    patches: [
        {
            find: "♫ (つ｡◕‿‿◕｡)つ ♪",
            replacement: {
                match: /(?<=function \i\((\i)\){)(?=var \i,\i=\i\.navId)/,
                replace: (_, props) => `Vencord.Api.ContextMenu._patchContextMenu(${props});`
            }
        }
    ]
});
