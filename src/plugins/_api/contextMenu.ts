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
import { Menu } from "@webpack/common";

// duplicate values have multiple branches with different types. Just include all to be safe
const nameMap = {
    radio: "MenuRadioItem",
    separator: "MenuSeparator",
    checkbox: "MenuCheckboxItem",
    groupstart: "MenuGroup",

    control: "MenuControlItem",
    compositecontrol: "MenuControlItem",

    item: "MenuItem",
    customitem: "MenuItem",
};

export default definePlugin({
    name: "ContextMenuAPI",
    description: "API for adding/removing items to/from context menus.",
    authors: [Devs.Nuckyz, Devs.Ven, Devs.Kyuuhachi],
    required: true,

    patches: [
        {
            find: "navId:",
            all: true,
            noWarn: true,
            replacement: [
                {
                    match: /navId:(?=.+?([,}].*?\)))/g,
                    replace: (m, rest) => {
                        // Check if this navId: match is a destructuring statement, ignore it if it is
                        const destructuringMatch = rest.match(/}=.+/);
                        if (destructuringMatch == null) {
                            return `contextMenuAPIArguments:typeof arguments!=='undefined'?arguments:[],${m}`;
                        }
                        return m;
                    }
                }
            ]
        },

        {
            find: "Menu API only allows Items",
            replacement: [
                // Patch the central context menu handler
                {
                    match: /(?=let{navId:)(?<=function \i\((\i)\).+?)/,
                    replace: "$1=Vencord.Api.ContextMenu._usePatchContextMenu($1);"
                },

                // Demangle Discord's Menu Item module
                {
                    match: /(?<=(\(\i\.type===(\i\.\i)\).{0,50}?navigable:.+Menu API).+?)}$/s,
                    replace: (_, m) => {
                        const registerCalls = [] as string[];

                        const typeCheckRe = canonicalizeMatch(/\(\i\.type===(\i\.\i)\)/g); // if (t.type === m.MenuItem)
                        const pushTypeRe = /type:"(\w+)"/g; // push({type:"item"})

                        let typeMatch: RegExpExecArray | null;
                        while ((typeMatch = typeCheckRe.exec(m)) !== null) {
                            const component = typeMatch[1];
                            // Set the starting index of the second regex to that of the first to start
                            // matching from after the if
                            pushTypeRe.lastIndex = typeCheckRe.lastIndex;

                            // extract the first type: "..."
                            const type = pushTypeRe.exec(m)?.[1];
                            if (type && type in nameMap) {
                                const name = nameMap[type];
                                registerCalls.push(`$self.registerMenuItem("${name}",${component})`);
                            }
                        }

                        if (registerCalls.length < 6) {
                            console.warn("[MenuItemDemanglerAPI] Expected to remap 6 items, only remapped", registerCalls.length);
                        }

                        return `${registerCalls.join(";")};}`;
                    },
                }
            ],
        },
    ],

    registerMenuItem(name: string, component: any) {
        Object.defineProperty(component, "name", { value: name });
        Menu[name] = component;
    }
});
