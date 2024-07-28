/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import { Settings } from "@api/Settings";
import { proxyLazy } from "@utils/lazy";
import { Logger } from "@utils/Logger";
import { Plugin } from "@utils/types";
import { Toasts } from "@webpack/common";

// Avoid circular dependency
const { startDependenciesRecursive, startPlugin, stopPlugin } = proxyLazy(() => require("../../plugins"));


const logger = new Logger("PluginSettings", "#a6d189");

function showErrorToast(message: string) {
    Toasts.show({
        message,
        type: Toasts.Type.FAILURE,
        id: Toasts.genId(),
        options: {
            position: Toasts.Position.BOTTOM
        }
    });
}

export function togglePluginEnabled(isEnabled: boolean, plugin: Plugin,onRestartNeeded: (pluginName: string) => void) {
    const settings = Settings.plugins[plugin.name];
    const wasEnabled = isEnabled;

    // If we're enabling a plugin, make sure all deps are enabled recursively.
    if (!wasEnabled) {
        const { restartNeeded, failures } = startDependenciesRecursive(plugin);
        if (failures.length) {
            logger.error(`Failed to start dependencies for ${plugin.name}: ${failures.join(", ")}`);
            showNotice("Failed to start dependencies: " + failures.join(", "), "Close", () => null);
            return;
        } else if (restartNeeded) {
            // If any dependencies have patches, don't start the plugin yet.
            settings.enabled = true;
            onRestartNeeded(plugin.name);
            return;
        }
    }

    // if the plugin has patches, dont use stopPlugin/startPlugin. Wait for restart to apply changes.
    if (plugin.patches?.length) {
        settings.enabled = !wasEnabled;
        onRestartNeeded(plugin.name);
        return;
    }

    // If the plugin is enabled, but hasn't been started, then we can just toggle it off.
    if (wasEnabled && !plugin.started) {
        settings.enabled = !wasEnabled;
        return;
    }

    const result = wasEnabled ? stopPlugin(plugin) : startPlugin(plugin);

    if (!result) {
        settings.enabled = false;

        const msg = `Error while ${wasEnabled ? "stopping" : "starting"} plugin ${plugin.name}`;
        logger.error(msg);
        showErrorToast(msg);
        return;
    }

    settings.enabled = !wasEnabled;
}

export const ExcludedReasons: Record<"web" | "discordDesktop" | "vencordDesktop" | "desktop" | "dev", string> = {
    desktop: "Discord Desktop app or Vesktop",
    discordDesktop: "Discord Desktop app",
    vencordDesktop: "Vesktop app",
    web: "Vesktop app and the Web version of Discord",
    dev: "Developer version of Vencord"
};
