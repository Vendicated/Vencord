/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { openPluginModal } from "@components/settings/tabs";
import { toggleEnabled } from "@equicordplugins/equicordHelper/utils";
import { SelectedChannelStore, Toasts } from "@webpack/common";

import { DEFAULT_CATEGORY_ID } from "../../metadata/categories";
import { TAG_PLUGINS, TAG_UTILITY } from "../../metadata/tags";
import type { CommandEntry } from "../../registry";
import { DEFAULT_EXTENSION_KEYBINDS, SILENT_TYPING_EXTENSION_ID } from "../catalog";
import type { ExtensionKeybindMap, SilentTypingPluginWithSettings, SilentTypingSettingsStore } from "../types";
import { createExecuteSecondaryAction } from "./actionHelpers";

function showToast(message: string, type: (typeof Toasts.Type)[keyof typeof Toasts.Type]) {
    Toasts.show({ message, type, id: Toasts.genId(), options: { position: Toasts.Position.BOTTOM } });
}

function getSilentTypingPlugin(): SilentTypingPluginWithSettings | null {
    const plugin = plugins.SilentTyping as SilentTypingPluginWithSettings | undefined;
    return plugin ?? null;
}

function getSilentTypingSettingsStore(): SilentTypingSettingsStore | null {
    const plugin = getSilentTypingPlugin();
    if (!plugin) return null;
    return plugin.settings?.store ?? null;
}

function parseSilentTypingLocations(locations: string): string[] {
    return locations.split(";").map(value => value.trim()).filter(Boolean);
}

function writeSilentTypingLocations(store: SilentTypingSettingsStore, nextLocations: string[]) {
    store.enabledLocations = nextLocations.join(";");
}

function toggleSilentTypingLocation(locationId: string): boolean {
    const store = getSilentTypingSettingsStore();
    if (!store) return false;

    const entries = parseSilentTypingLocations(store.enabledLocations);
    const next = new Set(entries);
    if (next.has(locationId)) {
        next.delete(locationId);
    } else {
        next.add(locationId);
    }

    writeSilentTypingLocations(store, Array.from(next));
    return true;
}

async function ensureSilentTypingPluginEnabled() {
    const plugin = getSilentTypingPlugin();
    if (!plugin) {
        showToast("SilentTyping plugin is unavailable.", Toasts.Type.FAILURE);
        return false;
    }

    if (isPluginEnabled(plugin.name)) return true;

    const success = await toggleEnabled(plugin.name);
    if (!success || !isPluginEnabled(plugin.name)) {
        showToast("Failed to enable SilentTyping.", Toasts.Type.FAILURE);
        return false;
    }

    showToast("Enabled SilentTyping.", Toasts.Type.SUCCESS);
    return true;
}

async function runSilentTypingChannelToggle() {
    if (!await ensureSilentTypingPluginEnabled()) return;

    const channelId = SelectedChannelStore?.getChannelId?.();
    if (!channelId) {
        showToast("No channel selected.", Toasts.Type.FAILURE);
        return;
    }

    const changed = toggleSilentTypingLocation(channelId);
    if (!changed) {
        showToast("SilentTyping settings are unavailable.", Toasts.Type.FAILURE);
        return;
    }

    showToast("Toggled SilentTyping for this channel.", Toasts.Type.SUCCESS);
}

async function runSilentTypingGlobalToggle() {
    if (!await ensureSilentTypingPluginEnabled()) return;

    const store = getSilentTypingSettingsStore();
    if (!store) {
        showToast("SilentTyping settings are unavailable.", Toasts.Type.FAILURE);
        return;
    }

    store.enabledGlobally = !store.enabledGlobally;
    showToast(`SilentTyping ${store.enabledGlobally ? "enabled" : "disabled"} globally.`, Toasts.Type.SUCCESS);
}

async function runSilentTypingOpenSettings() {
    if (!await ensureSilentTypingPluginEnabled()) return;

    const plugin = getSilentTypingPlugin();
    if (!plugin) {
        showToast("SilentTyping plugin is unavailable.", Toasts.Type.FAILURE);
        return;
    }

    openPluginModal(plugin);
}

export function createSilentTypingExtensionCommand(extensionKeybinds: Map<string, ExtensionKeybindMap>): CommandEntry {
    const keybinds = extensionKeybinds.get(SILENT_TYPING_EXTENSION_ID) ?? DEFAULT_EXTENSION_KEYBINDS[SILENT_TYPING_EXTENSION_ID];

    return {
        id: "extension-silent-typing-toggle",
        label: "Toggle SilentTyping",
        description: "Toggles SilentTyping for the current channel.",
        keywords: ["silenttyping", "silent typing", "typing", "plugin", "extension", "toggle", "channel", "global", "settings"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_PLUGINS, TAG_UTILITY],
        handler: runSilentTypingChannelToggle,
        actions: () => [
            createExecuteSecondaryAction({
                id: "toggle-global",
                label: "Toggle global",
                chord: keybinds.secondaryActionChord,
                handler: runSilentTypingGlobalToggle
            }),
            createExecuteSecondaryAction({
                id: "open-settings",
                label: "Open settings",
                chord: keybinds.tertiaryActionChord,
                handler: runSilentTypingOpenSettings
            })
        ]
    };
}
