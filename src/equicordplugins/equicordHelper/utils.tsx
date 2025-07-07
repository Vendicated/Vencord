/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import { Alerts, Toasts } from "@webpack/common";
import { Settings } from "Vencord";

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

function restartPrompt(): Promise<boolean> {
    return new Promise(resolve => {
        Alerts.show({
            title: "Restart Required",
            body: (
                <>
                    <p style={{ textAlign: "center" }}>
                        Some plugins require a restart to fully disable.
                    </p>
                    <p style={{ textAlign: "center" }}>Would you like to restart now?</p>
                </>
            ),
            confirmText: "Restart Now",
            cancelText: "Later",
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
        });
    });
}


export async function toggleEnabled(name: string) {
    let restartNeeded = false;
    function onRestartNeeded() {
        restartNeeded = true;
    }

    async function beforeReturn(settings: any, wasEnabled: boolean) {
        if (restartNeeded) {
            const confirmed = await restartPrompt();
            if (!confirmed) return false;

            settings.enabled = !wasEnabled;
            location.reload();
            return true;
        }

        return true;
    }

    const plugin = Vencord.Plugins.plugins[name];
    const settings = Settings.plugins[plugin.name];
    const isEnabled = () => settings.enabled ?? false;
    const wasEnabled = isEnabled();

    if (!wasEnabled) {
        const { restartNeeded, failures } = Vencord.Plugins.startDependenciesRecursive(plugin);
        if (failures.length) {
            console.error(`Failed to start dependencies for ${plugin.name}: ${failures.join(", ")}`);
            showNotice("Failed to start dependencies: " + failures.join(", "), "Close", () => null);
            return false;
        } else if (restartNeeded) {
            settings.enabled = true;
            onRestartNeeded();
            return await beforeReturn(settings, wasEnabled);
        }
    }

    if (plugin.patches?.length) {
        onRestartNeeded();
        return await beforeReturn(settings, wasEnabled);
    }

    if (wasEnabled && !plugin.started) {
        settings.enabled = !wasEnabled;
        return await beforeReturn(settings, wasEnabled);
    }

    const result = wasEnabled ? Vencord.Plugins.stopPlugin(plugin) : Vencord.Plugins.startPlugin(plugin);

    if (!result) {
        settings.enabled = false;
        const msg = `Error while ${wasEnabled ? "stopping" : "starting"} plugin ${plugin.name}`;
        console.error(msg);
        showErrorToast(msg);
        return false;
    }

    settings.enabled = !wasEnabled;
    return await beforeReturn(settings, wasEnabled);
}
