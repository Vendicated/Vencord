/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { isPluginEnabled, plugins } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { openPluginModal, openSettingsTabModal, PluginsTab, ThemesTab } from "@components/settings";
import { useAwaiter } from "@utils/react";
import { wordsFromCamel, wordsToTitle } from "@utils/text";
import { OptionType } from "@utils/types";
import { Menu, showToast, useMemo, useState } from "@webpack/common";
import type { ReactNode } from "react";

import { settings } from ".";

function buildPluginMenu() {
    const { showPluginMenu } = settings.use(["showPluginMenu"]);
    if (!showPluginMenu) return null;

    return (
        <Menu.MenuItem
            id="vc-toolbox-plugins"
            label="Plugins"
            action={() => openSettingsTabModal(PluginsTab)}
        >
            {buildPluginMenuEntries()}
        </Menu.MenuItem>
    );
}

export function buildPluginMenuEntries() {
    const pluginSettings = useSettings().plugins;

    const [search, setSearch] = useState("");

    const lowerSearch = search.toLowerCase();

    const sortedPlugins = useMemo(() =>
        Object.values(plugins).sort((a, b) => a.name.localeCompare(b.name)),
        []
    );

    const candidates = useMemo(() =>
        sortedPlugins
            .filter(p => {
                if (!isPluginEnabled(p.name)) return false;
                if (p.name.endsWith("API")) return false;

                const name = p.name.toLowerCase();
                return name.includes(lowerSearch);
            }),
        [lowerSearch]
    );

    return (
        <>
            <Menu.MenuControlItem
                id="vc-plugins-search"
                control={(props, ref) => (
                    <Menu.MenuSearchControl
                        {...props}
                        query={search}
                        onChange={setSearch}
                        ref={ref}
                    />
                )}
            />

            <Menu.MenuSeparator />

            {candidates
                .map(p => {
                    const options = [] as ReactNode[];

                    if (p.options) for (const [key, option] of Object.entries(p.options)) {
                        if ("hidden" in option && option.hidden) continue;

                        const s = pluginSettings[p.name];

                        const baseProps = {
                            id: `${p.name}-${key}`,
                            key: key,
                            label: wordsToTitle(wordsFromCamel(key)),
                            disabled: "disabled" in option ? option.disabled?.call(p.settings) : false,
                        };

                        switch (option.type) {
                            case OptionType.BOOLEAN:
                                options.push(
                                    <Menu.MenuCheckboxItem
                                        {...baseProps}
                                        checked={s[key]}
                                        action={() => {
                                            s[key] = !s[key];
                                            if (option.restartNeeded) showToast("Restart to apply the change");
                                        }}
                                    />
                                );
                                break;
                            case OptionType.SELECT:
                                options.push(
                                    <Menu.MenuItem {...baseProps}>
                                        {option.options.map(opt => (
                                            <Menu.MenuRadioItem
                                                group={`${p.name}-${key}`}
                                                id={`${p.name}-${key}-${opt.value}`}
                                                key={opt.label}
                                                label={opt.label}
                                                checked={s[key] === opt.value}
                                                action={() => {
                                                    s[key] = opt.value;
                                                    if (option.restartNeeded) showToast("Restart to apply the change");
                                                }}
                                            />
                                        ))}
                                    </Menu.MenuItem>
                                );
                                break;
                        }
                    }

                    if (!options.length) return null;

                    return (
                        <Menu.MenuItem
                            id={`vc-toolbox-plugin-${p.name}`}
                            key={p.name}
                            label={p.name}
                            action={() => openPluginModal(p)}
                        >
                            {options}

                            <Menu.MenuSeparator />

                            <Menu.MenuItem
                                id={`${p.name}-open`}
                                label={"Open Settings"}
                                action={() => openPluginModal(p)}
                            />
                        </Menu.MenuItem>
                    );
                })
            }
        </>
    );
}

function buildThemeMenu() {
    const { useQuickCss, enabledThemes } = useSettings(["useQuickCss", "enabledThemes"]);
    const [themes] = useAwaiter(VencordNative.themes.getThemesList);

    return (
        <Menu.MenuItem
            id="vc-toolbox-themes"
            label="Themes"
            action={() => openSettingsTabModal(ThemesTab)}
        >
            <Menu.MenuCheckboxItem
                id="vc-toolbox-quickcss-toggle"
                checked={useQuickCss}
                label={"Enable QuickCSS"}
                action={() => {
                    Settings.useQuickCss = !useQuickCss;
                }}
            />
            <Menu.MenuItem
                id="vc-toolbox-quickcss"
                label="Edit QuickCSS"
                action={() => VencordNative.quickCss.openEditor()}
            />
            <Menu.MenuItem
                id="vc-toolbox-themes-manage"
                label="Manage Themes"
                action={() => openSettingsTabModal(ThemesTab)}
            />
            {!!themes?.length && (
                <Menu.MenuGroup>
                    {themes.map(theme => (
                        <Menu.MenuCheckboxItem
                            id={`vc-toolbox-theme-${theme.fileName}`}
                            key={theme.fileName}
                            label={theme.name}
                            checked={enabledThemes.includes(theme.fileName)}
                            action={() => {
                                if (enabledThemes.includes(theme.fileName)) {
                                    Settings.enabledThemes = enabledThemes.filter(t => t !== theme.fileName);
                                } else {
                                    Settings.enabledThemes = [...enabledThemes, theme.fileName];
                                }
                            }}
                        />
                    ))}
                </Menu.MenuGroup>
            )}
        </Menu.MenuItem>
    );
}

function buildCustomPluginEntries() {
    const pluginEntries = [] as ReactNode[];

    for (const plugin of Object.values(plugins)) {
        if (plugin.toolboxActions && isPluginEnabled(plugin.name)) {
            const entries = typeof plugin.toolboxActions === "function"
                ? plugin.toolboxActions()
                : Object.entries(plugin.toolboxActions).map(([text, action]) => {
                    const key = `vc-toolbox-${plugin.name}-${text}`;

                    return (
                        <Menu.MenuItem
                            id={key}
                            key={key}
                            label={text}
                            action={action}
                        />
                    );
                });

            if (!entries || Array.isArray(entries) && entries.length === 0) continue;

            pluginEntries.push(
                <Menu.MenuItem
                    id={`vc-toolbox-${plugin.name}`}
                    key={`vc-toolbox-${plugin.name}`}
                    label={plugin.name}
                    action={() => openPluginModal(plugin)}
                >
                    <Menu.MenuGroup label={plugin.name}>
                        {entries}
                    </Menu.MenuGroup>
                </Menu.MenuItem>
            );
        }
    }

    return pluginEntries;
}

export function renderPopout(onClose: () => void) {
    return (
        <Menu.Menu
            navId="vc-toolbox"
            onClose={onClose}
        >
            <Menu.MenuItem
                id="vc-toolbox-notifications"
                label="Open Notification Log"
                action={openNotificationLogModal}
            />

            {buildThemeMenu()}
            {buildPluginMenu()}

            <Menu.MenuGroup>
                {buildCustomPluginEntries()}
            </Menu.MenuGroup>
        </Menu.Menu >
    );
}
