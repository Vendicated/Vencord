/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openPluginModal } from "@components/PluginSettings/PluginModal";
import { isObjectEmpty } from "@utils/misc";
import { Alerts, i18n, Menu, useMemo, useState } from "@webpack/common";

import Plugins from "~plugins";

function onRestartNeeded() {
    Alerts.show({
        title: "Restart required",
        body: <p>You have changed settings that require a restart.</p>,
        confirmText: "Restart now",
        cancelText: "Later!",
        onConfirm: () => location.reload()
    });
}

export default function PluginsSubmenu() {
    const sortedPlugins = useMemo(() => Object.values(Plugins)
        .sort((a, b) => a.name.localeCompare(b.name)), []);
    const [query, setQuery] = useState("");

    const search = query.toLowerCase();
    const include = (p: typeof Plugins[keyof typeof Plugins]) => (
        Vencord.Plugins.isPluginEnabled(p.name)
        && p.options && !isObjectEmpty(p.options)
        && (
            p.name.toLowerCase().includes(search)
            || p.description.toLowerCase().includes(search)
            || p.tags?.some(t => t.toLowerCase().includes(search))
        )
    );

    const plugins = sortedPlugins.filter(include);

    return (
        <>
            <Menu.MenuControlItem
                id="vc-plugins-search"
                control={(props, ref) => (
                    <Menu.MenuSearchControl
                        {...props}
                        query={query}
                        onChange={setQuery}
                        ref={ref}
                        placeholder={i18n.Messages.SEARCH}
                    />
                )}
            />

            {!!plugins.length && <Menu.MenuSeparator />}

            {plugins.map(p => (
                <Menu.MenuItem
                    key={p.name}
                    id={p.name}
                    label={p.name}
                    action={() => openPluginModal(p, onRestartNeeded)}
                />
            ))}
        </>
    );
}
