/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { toggleEnabled } from "@equicordplugins/equicordHelper/utils";
import { SettingsRouter, Toasts } from "@webpack/common";

import { DEFAULT_CATEGORY_ID } from "../../metadata/categories";
import { TAG_NAVIGATION, TAG_PLUGINS, TAG_UTILITY } from "../../metadata/tags";
import type { CommandEntry } from "../../registry";
import type { ThemeLibraryPlugin } from "../types";

function showToast(message: string, type: (typeof Toasts.Type)[keyof typeof Toasts.Type]) {
    Toasts.show({ message, type, id: Toasts.genId(), options: { position: Toasts.Position.BOTTOM } });
}

function getThemeLibraryPlugin(): ThemeLibraryPlugin | null {
    const plugin = plugins.ThemeLibrary as ThemeLibraryPlugin | undefined;
    return plugin ?? null;
}

async function ensureThemeLibraryPluginEnabled() {
    const plugin = getThemeLibraryPlugin();
    if (!plugin) {
        showToast("ThemeLibrary plugin is unavailable.", Toasts.Type.FAILURE);
        return false;
    }

    if (isPluginEnabled(plugin.name)) return true;

    const success = await toggleEnabled(plugin.name);
    if (!success || !isPluginEnabled(plugin.name)) {
        showToast("Failed to enable ThemeLibrary.", Toasts.Type.FAILURE);
        return false;
    }

    showToast("Enabled ThemeLibrary.", Toasts.Type.SUCCESS);
    return true;
}

async function runOpenThemeLibrary() {
    if (!await ensureThemeLibraryPluginEnabled()) return;
    SettingsRouter.openUserSettings("equicord_theme_library_panel");
}

export function createThemeLibraryExtensionCommand(): CommandEntry {
    return {
        id: "extension-theme-library-open",
        label: "Open Theme Library",
        description: "Open the ThemeLibrary settings page.",
        keywords: ["theme", "library", "themes", "settings", "plugin", "extension"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_PLUGINS, TAG_UTILITY, TAG_NAVIGATION],
        handler: runOpenThemeLibrary
    };
}
