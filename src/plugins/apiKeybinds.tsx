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
import definePlugin, { Plugin } from "@utils/types";


function isPluginEnabled(p: Plugin) {
    return (
        p?.required ||
        p?.isDependency ||
        Vencord.Settings.plugins[p.name]?.enabled
    ) ?? false;
}

let _pluginsWithKeybinds: Plugin[] | undefined = undefined;
const getPluginsWithKeybinds = () => {
    return _pluginsWithKeybinds ??= Object.values(Vencord.Plugins.plugins).filter(v => v.keybinds && isPluginEnabled(v));
};

export default definePlugin({
    name: "KeybindsAPI",
    description: "API for custom keybinds.",
    authors: [Devs.Arjix],

    patches: [
        {
            find: ".KEYBIND_DESCRIPTION_MODAL_NAVIGATE_SERVERS",
            replacement: [
                {
                    match: /var (\w+)=\(\w{1,2}\(\w+={},[\w.]+?SERVER_NEXT.*?;/s,
                    replace: "$&$self.addKeybinds($1);"
                },
                {
                    match: /(return\[)(\{.{10,30}KEYBIND_DESCRIPTION_MODAL_NAVIGATE_SERVERS)/,
                    replace: "$1...$self.getKeybinds(),$2"
                }
            ],
            all: true
        },
        {
            find: "keybindActionTypes",
            replacement: [{
                match: /key:"keybindActionTypes",get:function\(\)\{var .*?(\w)=\[.*?;/,
                replace: "$&$self.addKeybindActionTypes($1);"
            }, {
                match: /key:"keybindDescriptions",get:function\(\)\{var .*?(\w)=\(\w{2}\(\w={}.*?;/,
                replace: "$&$self.addKeybindDescriptions($1);"
            }]
        },
        {
            find: "addClaimedOutboundPromotionCode",
            replacement: {
                match: /\(\[([\w.]{5}\.MESSAGE,[\w.]{5}\.NAVIGATION,[\w.]{5}\.DND,[\w.]{5}\.CHAT)/,
                replace: (_, end) => {
                    const groups: string[] = [];

                    for (const plugin of getPluginsWithKeybinds()) {
                        groups.push(`"Vencord.${plugin.name}.${plugin.keybinds!.groupName}"`);
                    }

                    return `([...[${groups.join(",")}],${end}`;
                }
            }
        },
        {
            find: "KEYBINDS_REGISTER_GLOBAL_KEYBIND_ACTIONS:",
            replacement: [{
                match: /(\.Z\("KeybindsStore"\).*?\]);(.*?function\(.*?if\(null!=(\w)\[\w\]\){)/,
                replace: "$1;$self.setKeyEvents($3);$2"
            }, {
                match: /KEYBINDS_REGISTER_GLOBAL_KEYBIND_ACTIONS:function\((\w)\)\{/,
                replace: "$&;$self.setKeyEvents($1.keybinds);"
            }]
        },
        {
            find: ".USER_SETTINGS_KEYBINDS_MESSAGE_DESCRIPTION",
            replacement: [{
                match: /(function \w+\(\w\)\{)(switch\(\w\)\{case.{20,40}USER_SETTINGS_KEYBINDS_MESSAGE_DESCRIPTION;)/,
                replace: (_, func, rest) => `${func}let desc=$self.getGroupDescription(arguments[0]);if(desc)return desc;${rest}`
            }, {
                match: /(function \w+\(\w\)\{)(switch\(\w\)\{case.{20,40}USER_SETTINGS_KEYBINDS_NAVIGATION_SECTION_TITLE;)/,
                replace: (_, func, rest) => {
                    return `${func}let name=$self.getGroupName(arguments[0]);if(name)return name;${rest}`;
                }
            }]
        }
    ],
    getGroupName(groupId: string) {
        for (const plugin of getPluginsWithKeybinds()) {
            if (`Vencord.${plugin.name}.${plugin.keybinds!.groupName}` === groupId)
                return `Vencord - ${plugin.keybinds!.groupName}`;
        }
    },
    addKeybindActionTypes(actionTypes: { value: string, label: string; }[]) {
        for (const plugin of getPluginsWithKeybinds()) {
            for (const keybind of plugin.keybinds!.items) {
                actionTypes.push({
                    label: `${keybind.bindName} (Vencord)`,
                    value: `Vencord.${plugin.name}.${plugin.keybinds!.groupName}.${keybind.bindName}`
                });
            }
        }
    },
    addKeybindDescriptions(actionDescriptions: { [id: string]: string; }[]) {
        for (const plugin of getPluginsWithKeybinds()) {
            for (const keybind of plugin.keybinds!.items) {
                actionDescriptions[`Vencord.${plugin.name}.${plugin.keybinds!.groupName}.${keybind.bindName}`] = keybind.description;
            }
        }
    },
    getGroupDescription(groupId: string) {
        for (const plugin of getPluginsWithKeybinds()) {
            if (`Vencord.${plugin.name}.${plugin.keybinds!.groupName}` === groupId)
                return plugin.keybinds!.groupDescription;
        }
    },
    addKeybinds(_: any) {
        for (const plugin of getPluginsWithKeybinds()) {
            for (const keybind of plugin.keybinds!.items) {
                _[`Vencord.${plugin.name}.${plugin.keybinds!.groupName}.${keybind.bindName}`] = {
                    binds: keybind!.binds,
                    comboKeysBindGlobal: keybind!.global,
                    action: keybind!.action
                };
            }
        }
    },
    setKeyEvents(keyEvents: {
        [event: string]: {
            keyEvents: {
                blurred: boolean,
                focused: boolean,
                keydown: boolean,
                keyup: boolean;
            };
            onTrigger: any;
        };
    }) {
        for (const plugin of getPluginsWithKeybinds()) {
            for (const kb of plugin.keybinds!.items) {
                keyEvents[`Vencord.${plugin.name}.${plugin.keybinds!.groupName}.${kb.bindName}`] = {
                    keyEvents: {
                        blurred: kb?.keyEvents?.blurred ?? true,
                        focused: kb?.keyEvents?.focused ?? true,
                        keydown: kb?.keyEvents?.keydown ?? false,
                        keyup: kb?.keyEvents?.keyup ?? true
                    },
                    onTrigger: kb.action
                };
            }
        }
    },
    getKeybinds() {
        const binds: { description: string, binds: string[], group: string, groupEnd?: boolean; }[] = [];

        for (const plugin of getPluginsWithKeybinds()) {
            let pushed = false;

            for (const kb of plugin.keybinds!.items) {
                pushed = true;
                binds.push({
                    description: kb.description,
                    binds: kb.binds,
                    group: `Vencord.${plugin.name}.${plugin.keybinds!.groupName}`
                });
            }

            if (pushed) binds[binds.length - 1].groupEnd = true;
        }

        return binds;
    }
});
