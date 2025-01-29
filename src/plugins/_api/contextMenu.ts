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
import { canonicalizeMatch } from "@utils/patches";
import definePlugin from "@utils/types";
import { factoryListeners } from "@webpack";

/**
 * The last var name which the ContextMenu module was WebpackRequire'd and assigned to
 */
let lastVarName = "";

/**
 * The key exporting the ContextMenu module "Menu"
 */
let exportKey: string = "";

/**
 * The id of the module exporting the ContextMenu module "Menu"
 */
let modId: string = "";

function factoryListener(factory: any, id: string) {
    if (!Vencord.Plugins.isPluginEnabled("ContextMenuAPI")) {
        return factoryListeners.delete(factoryListener);
    }

    const str = String(factory);
    if (!str.includes("♫ (つ｡◕‿‿◕｡)つ ♪")) {
        return;
    }

    factoryListeners.delete(factoryListener);

    const match = str.match(canonicalizeMatch(/{(?=.+?function (\i){.{0,50}let{navId:).+?(\i):(?:function \(\){return |\(\)=>)\1/));
    if (match == null) {
        return;
    }

    exportKey = match[2];
    modId = id;
}

factoryListeners.add(factoryListener);

export default definePlugin({
    name: "ContextMenuAPI",
    description: "API for adding/removing items to/from context menus.",
    authors: [Devs.Nuckyz, Devs.Ven, Devs.Kyuuhachi],
    required: true,

    patches: [
        {
            find: "♫ (つ｡◕‿‿◕｡)つ ♪",
            replacement: {
                match: /(?=let{navId:)(?<=function \i\((\i)\).+?)/,
                replace: "$1=Vencord.Api.ContextMenu._usePatchContextMenu($1);"
            }
        },
        {
            find: "navId:",
            all: true,
            noWarn: true,
            replacement: [
                {
                    get match() {
                        return RegExp(`${String(modId)}(?<=(\\i)=.+?)`);
                    },
                    replace: (m, varName) => {
                        lastVarName = varName;
                        return m;
                    }
                },
                {
                    get match() {
                        return RegExp(`${String(exportKey)},{(?<=${lastVarName}\\.${String(exportKey)},{)`, "g");
                    },
                    replace: "$&contextMenuAPIArguments:typeof arguments!=='undefined'?arguments:[],"
                }
            ]
        }
    ]
});
