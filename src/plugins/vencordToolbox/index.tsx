/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import "./index.css";

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import PluginModal from "@components/PluginSettings/PluginModal";
import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";
import { Devs } from "@utils/constants";
import { makeLazy } from "@utils/lazy";
import { openModal } from "@utils/modal";
import { relaunch } from "@utils/native";
import { LazyComponent } from "@utils/react";
import definePlugin, { OptionType, PluginSettingDef } from "@utils/types";
import { findByCode } from "@webpack";
import { Alerts, Menu, Popout, Switch, useState } from "@webpack/common";
import type { ReactNode } from "react";

const HeaderBarIcon = LazyComponent(() => findByCode(".HEADER_BAR_BADGE,", ".tooltip"));
const getAllPlugins = makeLazy(() => Object.values(Vencord.Plugins.plugins));

function settingsSwitch(description: string, key: string, note: string, disabled = false): PluginSettingDef {
    return {
        type: OptionType.COMPONENT,
        description: description,
        component: () => (
            <Switch
                value={settings.store[key]}
                onChange={v => settings.store[key] = v}
                disabled={disabled}
                note={note}
            >
                {description}
            </Switch>
        )
    };
}
enum GreetMode {
    Greet = "Greet",
    NormalMessage = "Message"
}

const settings = definePluginSettings({
    // for enabling and disabling Vencord-wide quick actions
    relaunchDiscord: settingsSwitch("Relaunch Discord", "relaunchDiscord", "Quit and restart discord from toolbox", IS_WEB),
    notifs: settingsSwitch("Open Notification Log", "notifs", "View notifications log from toolbox"),
    quickCss: settingsSwitch("Edit QuickCss", "quickCss", "Edit QuickCss from toolbox"),
    toggleQuickCss: settingsSwitch("Toggle QuickCss", "toggleQuickCss", "Enable/Disable QuickCss from toolbox"),
    updater: settingsSwitch("UpdaterTab", "updater", "Open UpdaterTab from toolbox", IS_WEB),

    // for enabling and disabling misc plugin quick actions (can't be camelcase because they're used as variables)
    BadgeAPI: settingsSwitch("BadgeAPI", "BadgeAPI", "Refetch Badges from toolbox"),
    DevCompanion: settingsSwitch("DevCompanion", "DevCompanion", "Reconnect Dev Companion from toolbox"),

    // For enabling and disabling individual plugin settings menus
    pluginSettings: settingsSwitch("Plugin Settings", "pluginSettings", "Add plugin settings to toolbox"),
}).withPrivateSettings<{
    includedPlugins: string[];
}>();

function VencordPopout({ onClose }: { onClose: () => void; }) {
    // keeps track of added plugin settings entries
    const ps = settings.use(["includedPlugins"]);
    const { includedPlugins = [] } = ps;

    // keeps track of vencord-wide added quick actions
    const pluginEnabledEntries = [] as string[];

    // for Vencord-wide quick actions ex) quickCss, updater, notification log
    for (const [settingsName, enabled] of Object.entries(settings.store)) {
        if (enabled) {
            pluginEnabledEntries.push(settingsName);
        }
    }
    return (
        <Menu.Menu
            navId="vc-toolbox"
            onClose={onClose}>

            {!IS_WEB && settings.store.relaunchDiscord &&
                <Menu.MenuItem
                    id="vc-toolbox-relaunchdiscord"
                    label="Relaunch Discord"
                    action={() => relaunch()}
                />
            }

            {settings.store.notifs &&
                <Menu.MenuItem
                    id="vc-toolbox-notifications"
                    label="Notification Log"
                    action={openNotificationLogModal}
                />
            }
            <Menu.MenuGroup label="Vencord Settings">
                {settings.store.quickCss &&
                    <Menu.MenuItem
                        id="vc-toolbox-quickcss"
                        label="Edit QuickCSS"
                        action={() => VencordNative.quickCss.openEditor()}
                    />
                }

                {settings.store.toggleQuickCss &&
                    <Menu.MenuItem
                        id="vc-toolbox-disable-quickcss"
                        label="Toggle QuickCSS"
                        action={() => { Vencord.Settings.useQuickCss = !Vencord.Settings.useQuickCss; }}
                    />
                }

                {!IS_WEB && settings.store.updater &&
                    <Menu.MenuItem
                        id="vc-toolbox-updater-tab"
                        label="Open Updater"
                        action={openUpdaterModal}
                    />
                }
            </Menu.MenuGroup>

            {getAllPlugins() // misc plugin quick actions ex) DevCompanion and BadgesAPI
                .filter(plugin => plugin.toolboxActions && Vencord.Plugins.isPluginEnabled(plugin.name) && pluginEnabledEntries.includes(plugin.name))
                .map(plugin => (
                    <Menu.MenuGroup
                        label={plugin.name}
                        key={`vc-toolbox-${plugin.name}`}>
                        {plugin.toolboxActions && Object.entries(plugin.toolboxActions).map(([text, action]) => {
                            const key = `vc-toolbox-${plugin.name}-${text}`;
                            return (
                                <Menu.MenuItem
                                    id={key}
                                    key={key}
                                    label={text}
                                    action={action}
                                />
                            );
                        })}
                    </Menu.MenuGroup>
                ))
            }

            {settings.store.pluginSettings && // Main plugin setttings dropdown w/ checkboxes
                <Menu.MenuGroup label="Plugin Settings">
                    {getAllPlugins()
                        .filter(plugin => includedPlugins.includes(plugin.name))
                        .map(plugin => {
                            return (
                                <Menu.MenuItem
                                    id={"vc-toolbox-checkbox-" + plugin.name}
                                    key={"vc-toolbox-checkbox-key-" + plugin.name}
                                    label={plugin.name}
                                    action={() => {
                                        openModal(modalProps => (
                                            <PluginModal {...modalProps} plugin={plugin} onRestartNeeded={() => {
                                                Alerts.show({
                                                    title: "Restart required",
                                                    body: (
                                                        <>
                                                            <p>The following plugins require a restart:</p>
                                                            <div>{plugin.name}</div>
                                                        </>
                                                    ),
                                                    confirmText: "Restart now",
                                                    cancelText: "Later!",
                                                    onConfirm: () => location.reload()
                                                });
                                            }} />
                                        ));
                                    }}
                                />
                            );
                        })}
                    <Menu.MenuItem
                        id="vc-toolbox-plugins"
                        label="Add or Remove Plugins">
                        {getAllPlugins().filter(p => p.settings && Vencord.Plugins.isPluginEnabled(p.name)).map(plugin => {
                            const checked = includedPlugins.some(p => p === plugin.name);
                            return (
                                <Menu.MenuCheckboxItem
                                    key={"vc-toolbox-settings-key-" + plugin.name}
                                    id={"vc-toolbox-settings-" + plugin.name}
                                    label={plugin.name}
                                    checked={checked}
                                    action={() => { // when checked adds plugin to toolbox
                                        ps.includedPlugins = checked
                                            ? includedPlugins.filter(p => p !== plugin.name)
                                            : [...includedPlugins, plugin.name];
                                    }}
                                />
                            );
                        })}
                    </Menu.MenuItem>
                </Menu.MenuGroup>}
        </Menu.Menu>
    );
}

function VencordPopoutIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width={24} height={24}>
            <path fill="currentColor" d="M53 10h7v1h-1v1h-1v1h-1v1h-1v1h-1v1h5v1h-7v-1h1v-1h1v-1h1v-1h1v-1h1v-1h-5m-43 1v32h2v2h2v2h2v2h2v2h2v2h2v2h2v2h2v2h8v-2h2V46h-2v2h-2v2h-4v-2h-2v-2h-2v-2h-2v-2h-2v-2h-2V12m24 0v27h-2v3h4v-6h2v-2h4V12m13 2h5v1h-1v1h-1v1h-1v1h3v1h-5v-1h1v-1h1v-1h1v-1h-3m8 5h1v5h1v-1h1v1h-1v1h1v-1h1v1h-1v3h-1v1h-2v1h-1v1h1v-1h2v-1h1v2h-1v1h-2v1h-1v-1h-1v1h-6v-1h-1v-1h-1v-2h1v1h2v1h3v1h1v-1h-1v-1h-3v-1h-4v-4h1v-2h1v-1h1v-1h1v2h1v1h1v-1h1v1h-1v1h2v-2h1v-2h1v-1h1m-13 4h2v1h-1v4h1v2h1v1h1v1h1v1h4v1h-6v-1h-6v-1h-1v-5h1v-1h1v-2h2m17 3h1v3h-1v1h-1v1h-1v2h-2v-2h2v-1h1v-1h1m1 0h1v3h-1v1h-2v-1h1v-1h1m-30 2v8h-8v32h8v8h32v-8h8v-8H70v8H54V44h16v8h16v-8h-8v-8h-1v1h-7v-1h-2v1h-8v-1" />
        </svg>
    );
}

function VencordPopoutButton() {
    const [show, setShow] = useState(false);

    return (
        <Popout
            position="bottom"
            align="right"
            animation={Popout.Animation.NONE}
            shouldShow={show}
            onRequestClose={() => setShow(false)}
            renderPopout={() => <VencordPopout onClose={() => setShow(false)} />}
        >
            {(_, { isShown }) => (
                <HeaderBarIcon
                    className="vc-toolbox-btn"
                    onClick={() => setShow(v => !v)}
                    tooltip={isShown ? null : "Vencord Toolbox"}
                    icon={VencordPopoutIcon}
                    selected={isShown}
                />
            )}
        </Popout>
    );
}

function ToolboxFragmentWrapper({ children }: { children: ReactNode[]; }) {
    children.splice(
        children.length - 1, 0,
        <ErrorBoundary noop={true}>
            <VencordPopoutButton />
        </ErrorBoundary>
    );

    return <>{children}</>;
}

export default definePlugin({
    name: "VencordToolbox",
    description: "Adds a button next to the inbox button in the channel header that houses Vencord quick actions.",
    authors: [Devs.Ven, Devs.AutumnVN],
    settings,

    patches: [
        {
            find: ".mobileToolbar",
            replacement: {
                match: /(?<=toolbar:function.{0,100}\()\i.Fragment,/,
                replace: "$self.ToolboxFragmentWrapper,"
            }
        }
    ],

    ToolboxFragmentWrapper: ErrorBoundary.wrap(ToolboxFragmentWrapper, {
        fallback: () => <p style={{ color: "red" }}>Failed to render :(</p>
    })
});
