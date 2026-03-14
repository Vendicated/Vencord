/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { openPluginModal } from "@components/settings/tabs";
import { toggleEnabled } from "@equicordplugins/equicordHelper/utils";
import { Toasts } from "@webpack/common";

import { DEFAULT_CATEGORY_ID } from "../../metadata/categories";
import { TAG_PLUGINS, TAG_UTILITY } from "../../metadata/tags";
import type { CommandEntry } from "../../registry";
import { DEFAULT_EXTENSION_KEYBINDS, SILENT_MESSAGE_TOGGLE_EXTENSION_ID } from "../catalog";
import type { ExtensionKeybindMap, SilentMessageTogglePluginWithSettings, SilentMessageToggleSettingsStore } from "../types";
import { createExecuteSecondaryAction } from "./actionHelpers";

function showToast(message: string, type: (typeof Toasts.Type)[keyof typeof Toasts.Type]) {
    Toasts.show({ message, type, id: Toasts.genId(), options: { position: Toasts.Position.BOTTOM } });
}

function getSilentMessageTogglePlugin(): SilentMessageTogglePluginWithSettings | null {
    const plugin = plugins.SilentMessageToggle as SilentMessageTogglePluginWithSettings | undefined;
    return plugin ?? null;
}

function getSilentMessageToggleSettingsStore(): SilentMessageToggleSettingsStore | null {
    const plugin = getSilentMessageTogglePlugin();
    if (!plugin) return null;
    return plugin.settings?.store ?? null;
}

async function ensureSilentMessageTogglePluginEnabled() {
    const plugin = getSilentMessageTogglePlugin();
    if (!plugin) {
        showToast("SilentMessageToggle plugin is unavailable.", Toasts.Type.FAILURE);
        return false;
    }

    if (isPluginEnabled(plugin.name)) return true;

    const success = await toggleEnabled(plugin.name);
    if (!success || !isPluginEnabled(plugin.name)) {
        showToast("Failed to enable SilentMessageToggle.", Toasts.Type.FAILURE);
        return false;
    }

    showToast("Enabled SilentMessageToggle.", Toasts.Type.SUCCESS);
    return true;
}

async function runSilentMessageTogglePlugin() {
    const plugin = getSilentMessageTogglePlugin();
    if (!plugin) {
        showToast("SilentMessageToggle plugin is unavailable.", Toasts.Type.FAILURE);
        return;
    }

    const wasEnabled = isPluginEnabled(plugin.name);
    const success = await toggleEnabled(plugin.name);
    const isEnabledNow = isPluginEnabled(plugin.name);

    if (!success) {
        showToast("Failed to toggle SilentMessageToggle.", Toasts.Type.FAILURE);
        return;
    }

    if (wasEnabled !== isEnabledNow) {
        showToast(`SilentMessageToggle ${isEnabledNow ? "enabled" : "disabled"}.`, Toasts.Type.SUCCESS);
        return;
    }

    showToast("SilentMessageToggle did not change.", Toasts.Type.MESSAGE);
}

async function runSilentMessageToggleAutoDisable() {
    if (!await ensureSilentMessageTogglePluginEnabled()) return;

    const store = getSilentMessageToggleSettingsStore();
    if (!store) {
        showToast("SilentMessageToggle settings are unavailable.", Toasts.Type.FAILURE);
        return;
    }

    store.autoDisable = !store.autoDisable;
    showToast(`SilentMessageToggle auto disable ${store.autoDisable ? "enabled" : "disabled"}.`, Toasts.Type.SUCCESS);
}

async function runSilentMessageToggleOpenSettings() {
    if (!await ensureSilentMessageTogglePluginEnabled()) return;

    const plugin = getSilentMessageTogglePlugin();
    if (!plugin) {
        showToast("SilentMessageToggle plugin is unavailable.", Toasts.Type.FAILURE);
        return;
    }

    openPluginModal(plugin);
}

export function createSilentMessageToggleExtensionCommand(extensionKeybinds: Map<string, ExtensionKeybindMap>): CommandEntry {
    const keybinds = extensionKeybinds.get(SILENT_MESSAGE_TOGGLE_EXTENSION_ID) ?? DEFAULT_EXTENSION_KEYBINDS[SILENT_MESSAGE_TOGGLE_EXTENSION_ID];

    return {
        id: "extension-silent-message-toggle-plugin",
        label: "Toggle SilentMessageToggle",
        description: "Toggle the SilentMessageToggle plugin.",
        keywords: ["silent", "message", "toggle", "plugin", "extension", "auto disable", "settings"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_PLUGINS, TAG_UTILITY],
        handler: runSilentMessageTogglePlugin,
        actions: () => [
            createExecuteSecondaryAction({
                id: "toggle-auto-disable",
                label: "Toggle auto disable",
                chord: keybinds.secondaryActionChord,
                handler: runSilentMessageToggleAutoDisable
            }),
            createExecuteSecondaryAction({
                id: "open-settings",
                label: "Open settings",
                chord: keybinds.tertiaryActionChord,
                handler: runSilentMessageToggleOpenSettings
            })
        ]
    };
}
