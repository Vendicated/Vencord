/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { IpcPlugin, SettingsDefinition, SettingsStore } from "@utils/types";

import ipcPlugins from "~ipcPlugins";

declare global {
    interface Window {
        ipcPlugins: Record<string, IpcPlugin>;
        PluginSettings: Record<string, SettingsStore<SettingsDefinition>>;
    }
}

if (!window.ipcPlugins) window.ipcPlugins = {};

for (const _plugin of Object.values(ipcPlugins)) {
    const plugin = _plugin as IpcPlugin;
    window.ipcPlugins[plugin.name] = plugin;
}


for (const plugin of Object.values(window.ipcPlugins)) {
    if (window.location.href.match(plugin.matcher)) plugin.entrypoint(window.PluginSettings[plugin.name]);
}
