/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginSettingArrayDef } from "@utils/types";
import { Channel, Guild, User } from "@vencord/discord-types";
import { Menu, React } from "@webpack/common";

type ContextMenuType = Channel | User | Guild;

function createContextMenuItem(name: string, value: ContextMenuType) {
    return (
        <Menu.MenuItem
            id="vc-plugin-settings"
            label="Plugins"
        >
            {renderRegisteredPlugins(name, value)}
        </Menu.MenuItem>
    );
}


function renderRegisteredPlugins(name: string, value: ContextMenuType) {
    const type = name === "Guild" ? OptionType.GUILDS : name === "User" ? OptionType.USERS : OptionType.CHANNELS;
    const plugins = registeredPlugins[type];


    const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>(
        Object.fromEntries(
            Object.keys(plugins).flatMap(plugin =>
                plugins[plugin].map(setting => [`${plugin}-${setting}-${value.id}`, Vencord.Plugins.plugins[plugin].settings!.store[setting].includes(value.id)])
            )
        )
    );

    const handleCheckboxClick = (plugin: string, setting: string) => {
        const key = `${plugin}-${setting}-${value.id}`;
        setCheckedItems(prevState => ({
            ...prevState,
            [key]: !prevState[key]
        }));

        // settings must be defined otherwise the checkbox wouldn't exist in the first place
        const { store, def } = Vencord.Plugins.plugins[plugin].settings!;
        store[setting] = store[setting].includes(value.id)
            ? store[setting].filter((id: string) => id !== value.id)
            : [...store[setting], value.id];

        def[setting].onChange?.(store[setting]);

    };
    return Object.entries(plugins).map(([plugin, settings]) => (
        <Menu.MenuItem
            id={`vc-plugin-settings-${plugin}`}
            label={plugin}
            key={`vc-plugin-settings-${plugin}`}
        >
            {settings.map(setting => (
                <Menu.MenuCheckboxItem
                    id={`vc-plugin-settings-${plugin}-${setting}`}
                    key={`vc-plugin-settings-${plugin}-${setting}`}
                    label={(Vencord.Plugins.plugins[plugin].settings!.def[setting] as PluginSettingArrayDef).popoutText ?? setting}
                    action={() => handleCheckboxClick(plugin, setting)}
                    checked={checkedItems[`${plugin}-${setting}-${value.id}`]}
                />
            ))}
        </Menu.MenuItem>
    ));
}



// "mutable" in this context refers to the "mute/unmute" context menu items in discord.
function MutableContextCallback(type: string): NavContextMenuPatchCallback {
    const muteType = type === "Guild" ? "guild" : "channel";

    return (children, props) => {
        let idx = -1;

        const container = findGroupChildrenByChildId(`mute-${muteType}`, children) || findGroupChildrenByChildId(`unmute-${muteType}`, children);
        if (container) {
            idx = children.findIndex(c => c?.props?.children != null && c.props.children === container);
        }

        if (idx !== -1) {
            const newGroup = (
                <Menu.MenuGroup>
                    {createContextMenuItem(type, props[muteType])}
                </Menu.MenuGroup>
            );
            children.splice(idx + 1, 0, newGroup);
        }
    };
}


const UserContext: NavContextMenuPatchCallback = (children, props) => {
    const container = findGroupChildrenByChildId("close-dm", children);
    let idx = 0; // default to 0 for user profile, this will automatically add after "invite to server"
    if (container) {
        idx = children.findIndex(c => c?.props?.children != null && c.props.children === container);
    }

    const newGroup = (
        <Menu.MenuGroup>
            {createContextMenuItem("User", props.user)}
        </Menu.MenuGroup>
    );
    children.splice(idx + 1, 0, newGroup);
};

// {type: {plugin: [setting, setting, setting]}}
const registeredPlugins: Record<OptionType.USERS | OptionType.GUILDS | OptionType.CHANNELS, Record<string, Array<string>>> = {
    [OptionType.USERS]: {},
    [OptionType.GUILDS]: {},
    [OptionType.CHANNELS]: {}
};


export default definePlugin({
    name: "SettingArraysAPI",
    description: "API that automatically adds context menus for User/Guild/Channel arrays of plugins",
    authors: [Devs.Elvyra],
    contextMenus: {
        "channel-context": MutableContextCallback("Channel"),
        "thread-context": MutableContextCallback("Channel"),
        "gdm-context": MutableContextCallback("Channel"),
        "guild-context": MutableContextCallback("Guild"),
        "user-context": UserContext,
        "user-profile-actions": UserContext,
        "user-profile-overflow-menu": UserContext,
    },
    required: true,

    start() {
        for (const plugin of Object.values(Vencord.Plugins.plugins)) {
            if (!Vencord.Plugins.isPluginEnabled(plugin.name) || !plugin.settings) continue;
            for (const [key, setting] of Object.entries(plugin.settings.def)) {
                if ((setting.type === OptionType.USERS || setting.type === OptionType.GUILDS || setting.type === OptionType.CHANNELS) && !setting.hidePopout) {
                    if (!registeredPlugins[setting.type][plugin.name]) {
                        registeredPlugins[setting.type][plugin.name] = [];
                    }
                    registeredPlugins[setting.type][plugin.name].push(key);
                }
            }
        }
    }
});
