/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, pluginRequiresRestart, plugins, startDependenciesRecursive, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import type { Plugin } from "@utils/types";
import { showToast } from "@webpack/common";

import type { PaletteCommand, PaletteListItem } from "../api/types";
import { GearIcon, PlugIcon } from "../ui/icons";

function togglePlugin(plugin: Plugin) {
    const wasEnabled = isPluginEnabled(plugin.name);
    const pluginSettings = Settings.plugins[plugin.name];

    if (!wasEnabled) {
        const { restartNeeded, failures } = startDependenciesRecursive(plugin);
        if (failures.length) {
            showToast({ text: `Failed to start dependencies: ${failures.join(", ")}`, variant: "critical" });
            return;
        }
        if (restartNeeded) {
            pluginSettings.enabled = true;
            showToast({ text: `${plugin.name} enabled. Restart to apply.` });
            return;
        }
    }

    if (pluginRequiresRestart(plugin)) {
        pluginSettings.enabled = !wasEnabled;
        showToast({ text: `${plugin.name} ${wasEnabled ? "disabled" : "enabled"}. Restart to apply.` });
        return;
    }

    if (wasEnabled && !plugin.started) {
        pluginSettings.enabled = false;
        showToast({ text: `${plugin.name} disabled.`, variant: "success" });
        return;
    }

    const result = wasEnabled ? stopPlugin(plugin) : startPlugin(plugin);
    if (!result) {
        pluginSettings.enabled = false;
        showToast({ text: `Error while ${wasEnabled ? "stopping" : "starting"} ${plugin.name}.`, variant: "critical" });
        return;
    }

    pluginSettings.enabled = !wasEnabled;
    showToast({ text: `${plugin.name} ${wasEnabled ? "disabled" : "enabled"}.`, variant: "success" });
}

function pluginItems(): PaletteListItem[] {
    return Object.values(plugins)
        .filter(plugin => !plugin.required && !plugin.hidden)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(plugin => {
            const enabled = isPluginEnabled(plugin.name);
            return {
                id: plugin.name,
                label: plugin.name,
                sublabel: enabled ? "Enabled" : "Disabled",
                icon: PlugIcon,
                actions: [
                    {
                        id: "toggle",
                        label: enabled ? "Disable Plugin" : "Enable Plugin",
                        keepOpen: true,
                        run: () => togglePlugin(plugin)
                    },
                    {
                        id: "settings",
                        label: "Open Plugin Settings",
                        icon: GearIcon,
                        run: () => openPluginModal(plugin)
                    }
                ]
            };
        });
}

export const pluginCommands: PaletteCommand[] = [
    {
        id: "plugins.manage",
        title: "Manage Plugins",
        section: "Plugins",
        keywords: ["plugins", "enable", "disable", "toggle"],
        icon: PlugIcon,
        page: () => ({
            title: "Manage Plugins",
            icon: PlugIcon,
            spec: { type: "list", placeholder: "Search plugins...", items: pluginItems }
        })
    }
];
