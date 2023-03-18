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
import definePlugin from "@utils/types";
import { addListener, removeListener } from "@webpack";

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
                replacement: [{
                    match: RegExp(`${id}(?<=(\\i)=.+?).+$`),
                    replace: (code, varName) => {
                        const regex = RegExp(`${key},{(?<=${varName}\\.${key},{)`, "g");
                        return code.replace(regex, "$&contextMenuApiArguments:arguments,");
                    }
                }]
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
