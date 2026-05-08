/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SettingsStore } from "@api/Settings";
import type { DefinedSettings, SettingsDefinition } from "@utils/types";

import { Alerts } from "../utils/ui";

type RestartTrackingSettings = Pick<DefinedSettings<SettingsDefinition>, "def" | "pluginName">;

let restartDirty = false;
let didAttachRestartListeners = false;
const restartListenerCleanups: (() => void)[] = [];

function getRestartSettingPaths(settings: RestartTrackingSettings): string[] {
    return Object.entries(settings.def)
        .filter(([, definition]) => definition.restartNeeded)
        .map(([key]) => `plugins.${settings.pluginName}.${key}`);
}

export function initializeRestartTracking(settings: RestartTrackingSettings): void {
    if (didAttachRestartListeners) {
        return;
    }

    didAttachRestartListeners = true;

    for (const path of getRestartSettingPaths(settings)) {
        const markRestartDirty = () => { restartDirty = true; };

        SettingsStore.addChangeListener(path, markRestartDirty);
        restartListenerCleanups.push(() => SettingsStore.removeChangeListener(path, markRestartDirty));
    }
}

export function disposeRestartTracking(): void {
    for (const cleanup of restartListenerCleanups.splice(0)) {
        cleanup();
    }

    didAttachRestartListeners = false;
}

export function isRestartDirty(): boolean {
    return restartDirty;
}

export function promptToRestartIfDirty(): boolean {
    if (!restartDirty) {
        return false;
    }

    Alerts.show({
        title: "Restart Required",
        body: "A change you've made to Questify's settings requires a restart.",
        confirmText: "Restart",
        cancelText: "Later",
        onConfirm: () => location.reload(),
    });

    return true;
}
