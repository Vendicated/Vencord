/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
    name: "MenuItemDemanglerAPI",
    description: "Demangles Discord's Menu Item module",
    authors: [Devs.Ven],
    required: true,
    patches: [
        {
            find: "Menu API only allows Items",
            replacement: {
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
            },
        },
    ],

    registerMenuItem(name: string, component: any) {
        Object.defineProperty(component, "name", { value: name });
        Menu[name] = component;
    }
});
