/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { getCurrentGuild } from "@utils/discord";
import definePlugin, { OptionType, PluginSettingArrayDef } from "@utils/types";
import { Channel, Guild, Role, User } from "@vencord/discord-types";
import { GuildRoleStore, Menu, React } from "@webpack/common";

type ContextMenuType = Channel | User | Guild | Role;

function createContextMenuItem(name: string, value: ContextMenuType) {
    const type = name === "Guild" ? OptionType.GUILDS : name === "User" ? OptionType.USERS : name === "Channel" ? OptionType.CHANNELS : OptionType.ROLES;
    if (Object.keys((registeredPlugins[type])).length === 0) return null;

    return (
        <Menu.MenuItem
            id="vc-plugin-settings"
            label="Plugins"
        >
            {renderRegisteredPlugins(type, value)}
        </Menu.MenuItem>
    );
}


function renderRegisteredPlugins(type: OptionType, value: ContextMenuType) {
    const plugins: Record<string, Array<string>> = registeredPlugins[type];

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
                    label={(() => {
                        const popout = (Vencord.Plugins.plugins[plugin].settings!.def[setting] as PluginSettingArrayDef).popoutText;
                        return typeof popout === "function"
                            ? popout()
                            : popout ?? setting;
                    })()}
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


const RoleContext: NavContextMenuPatchCallback = (children, { id }: { id: string; }) => {
    if (!registeredPlugins[OptionType.ROLES]) return null;
    const guild = getCurrentGuild();
    if (!guild) return;

    const role = GuildRoleStore.getRole(guild.id, id);
    if (!role) return;

    children.push(createContextMenuItem("Role", role));
};


// {type: {plugin: [setting, setting, setting]}}
const registeredPlugins: Record<OptionType.USERS | OptionType.GUILDS | OptionType.CHANNELS | OptionType.ROLES, Record<string, Array<string>>> = {
    [OptionType.USERS]: {},
    [OptionType.GUILDS]: {},
    [OptionType.CHANNELS]: {},
    [OptionType.ROLES]: {},
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
        // This requires developer mode, but I don't think it's sensible to force enable it for this alone
        "dev-context": RoleContext,
    },
    required: true,

    start() {
        for (const plugin of Object.values(Vencord.Plugins.plugins)) {
            if (!Vencord.Plugins.isPluginEnabled(plugin.name) || !plugin.settings) continue;
            for (const [key, setting] of Object.entries(plugin.settings.def)) {
                if ((setting.type === OptionType.USERS || setting.type === OptionType.GUILDS || setting.type === OptionType.CHANNELS || setting.type === OptionType.ROLES) && !setting.hidePopout) {
                    if (!registeredPlugins[setting.type][plugin.name]) {
                        registeredPlugins[setting.type][plugin.name] = [];
                    }
                    registeredPlugins[setting.type][plugin.name].push(key);
                }
            }
        }
    }
});
