/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, React } from "@webpack/common";

function createContextMenu(name: "Guild" | "User" | "Channel", value: any) {
    return (
        <Menu.MenuItem
            id="vc-plugin-settings"
            label="Plugins"
        >
            {renderRegisteredPlugins(name, value)}
        </Menu.MenuItem>
    );
}


function renderRegisteredPlugins(name: "Guild" | "User" | "Channel", value: any) {
    const type = name === "Guild" ? OptionType.GUILDS : name === "User" ? OptionType.USERS : OptionType.CHANNELS;
    const plugins = registeredPlugins[type];


    const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>(
        Object.fromEntries(
            Object.keys(plugins).flatMap(plugin =>
                plugins[plugin].map(setting => [`${plugin}-${setting}-${value.id}`, Vencord.Plugins.plugins[plugin].settings?.store[setting].includes(value.id)])
            )
        )
    );

    const handleCheckboxClick = (plugin: string, setting: string) => {
        const key = `${plugin}-${setting}-${value.id}`;
        setCheckedItems(prevState => ({
            ...prevState,
            [key]: !prevState[key]
        }));
        // @ts-ignore settings must be defined otherwise we wouldn't be here
        const s = Vencord.Plugins.plugins[plugin].settings.store[setting];
        // @ts-ignore
        Vencord.Plugins.plugins[plugin].settings.store[setting] = s.includes(value.id)
            ? s.filter(id => id !== value.id)
            : [...s, value.id];

    };
    return Object.keys(plugins).map(plugin => (
        <Menu.MenuItem
            id={`vc-plugin-settings-${plugin}`}
            label={plugin}
        >
            {plugins[plugin].map(setting => (
                <Menu.MenuCheckboxItem
                    id={`vc-plugin-settings-${plugin}-${setting}`}
                    label={Vencord.Plugins.plugins[plugin].settings?.def[setting].popoutText ?? setting}
                    action={() => handleCheckboxClick(plugin, setting)}
                    checked={checkedItems[`${plugin}-${setting}-${value.id}`]}
                />
            ))}
        </Menu.MenuItem>
    ));
}


function MakeContextCallback(name: "Guild" | "User" | "Channel"): NavContextMenuPatchCallback {
    return (children, props) => {
        const value = props[name.toLowerCase()];
        if (!value) return;
        if (props.label === getIntlMessage("CHANNEL_ACTIONS_MENU_LABEL")) return; // random shit like notification settings

        const lastChild = children.at(-1);
        if (lastChild?.key === "developer-actions") {
            const p = lastChild.props;
            if (!Array.isArray(p.children))
                p.children = [p.children];

            children = p.children;
        }
        children.splice(-1, 0,
            createContextMenu(name, value)
        );
    };
}


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
        "channel-context": MakeContextCallback("Channel"),
        "thread-context": MakeContextCallback("Channel"),
        "guild-context": MakeContextCallback("Guild"),
        "user-context": MakeContextCallback("User")
    },

    start() {
        for (const plugin of Object.values(Vencord.Plugins.plugins)) {
            if (!Vencord.Plugins.isPluginEnabled(plugin.name) || !plugin.settings) continue;
            const settings = plugin.settings.def;
             for (const settingKey of Object.keys(settings)) {
                const setting = settings[settingKey];
                if ((setting.type === OptionType.USERS || setting.type === OptionType.GUILDS || setting.type === OptionType.CHANNELS) && !setting.hidePopout) {
                    if (!registeredPlugins[setting.type][plugin.name]) {
                        registeredPlugins[setting.type][plugin.name] = [];
                    }
                    registeredPlugins[setting.type][plugin.name].push(settingKey);
                }
            }
        }
    }
});

