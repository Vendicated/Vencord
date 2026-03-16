/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { TAG_PLUGINS, TAG_UTILITY } from "../metadata/tags";
import type { ExtensionDefinition } from "../registry";
import type { ExtensionKeybindMap } from "./types";

export const INSTALLED_EXTENSIONS_KEY = "CommandPaletteInstalledExtensions";
export const EXTENSION_KEYBINDS_KEY = "CommandPaletteExtensionKeybinds";

export const EXTENSIONS_ROOT_CATEGORY_ID = "extensions-root";
export const EXTENSIONS_CATALOG_CATEGORY_ID = "extensions-catalog";
export const EXTENSIONS_DETAIL_PROVIDER_ID = "extensions-detail-provider";
export const EXTENSIONS_PACK_PROVIDER_ID = "extensions-pack-provider";

export const SILENT_TYPING_EXTENSION_ID = "silent-typing";
export const SILENT_TYPING_EXTENSION_DETAIL_CATEGORY_ID = "extensions-detail-silent-typing";
export const RANDOM_VOICE_EXTENSION_ID = "random-voice";
export const RANDOM_VOICE_EXTENSION_DETAIL_CATEGORY_ID = "extensions-detail-random-voice";
export const HOLY_NOTES_EXTENSION_ID = "holy-notes";
export const HOLY_NOTES_EXTENSION_DETAIL_CATEGORY_ID = "extensions-detail-holy-notes";
export const SILENT_MESSAGE_TOGGLE_EXTENSION_ID = "silent-message-toggle";
export const SILENT_MESSAGE_TOGGLE_EXTENSION_DETAIL_CATEGORY_ID = "extensions-detail-silent-message-toggle";
export const SCHEDULED_MESSAGES_EXTENSION_ID = "scheduled-messages";
export const SCHEDULED_MESSAGES_EXTENSION_DETAIL_CATEGORY_ID = "extensions-detail-scheduled-messages";
export const THEME_LIBRARY_EXTENSION_ID = "theme-library";
export const THEME_LIBRARY_EXTENSION_DETAIL_CATEGORY_ID = "extensions-detail-theme-library";

export const DEFAULT_EXTENSION_KEYBINDS: Record<string, ExtensionKeybindMap> = {
    [SILENT_TYPING_EXTENSION_ID]: {
        secondaryActionChord: "meta+enter",
        tertiaryActionChord: "alt+enter"
    },
    [RANDOM_VOICE_EXTENSION_ID]: {
        secondaryActionChord: "meta+enter",
        tertiaryActionChord: "alt+enter"
    },
    [SILENT_MESSAGE_TOGGLE_EXTENSION_ID]: {
        secondaryActionChord: "meta+enter",
        tertiaryActionChord: "alt+enter"
    }
};

export const EXTENSIONS_CATALOG: ExtensionDefinition[] = [
    {
        id: SILENT_TYPING_EXTENSION_ID,
        label: "SilentTyping",
        description: "Control the SilentTyping plugin from the command palette.",
        detailCategoryId: SILENT_TYPING_EXTENSION_DETAIL_CATEGORY_ID,
        commandId: "extension-silent-typing-toggle",
        commandLabel: "Toggle SilentTyping",
        commandDescription: "Run the extension command from this detail page.",
        sourcePath: "src/plugins/silentTyping",
        tags: [TAG_PLUGINS, TAG_UTILITY],
        keywords: ["extension", "plugin", "silent", "typing", "toggle", "keyboard"]
    },
    {
        id: RANDOM_VOICE_EXTENSION_ID,
        label: "RandomVoice",
        description: "Control the RandomVoice plugin from the command palette.",
        detailCategoryId: RANDOM_VOICE_EXTENSION_DETAIL_CATEGORY_ID,
        commandId: "extension-random-voice-join",
        commandLabel: "Join Random Voice",
        commandDescription: "Run the extension command from this detail page.",
        sourcePath: "src/equicordplugins/randomVoice",
        tags: [TAG_PLUGINS, TAG_UTILITY],
        keywords: ["extension", "plugin", "random", "voice", "join", "channel", "vc"]
    },
    {
        id: HOLY_NOTES_EXTENSION_ID,
        label: "HolyNotes",
        description: "Control HolyNotes from the command palette.",
        detailCategoryId: HOLY_NOTES_EXTENSION_DETAIL_CATEGORY_ID,
        commandId: "extension-holy-notes-open",
        commandLabel: "Open Notes",
        commandDescription: "Open the HolyNotes notebook modal.",
        sourcePath: "src/equicordplugins/holyNotes",
        tags: [TAG_PLUGINS, TAG_UTILITY],
        keywords: ["extension", "plugin", "holy", "notes", "notebook", "bookmark"]
    },
    {
        id: SILENT_MESSAGE_TOGGLE_EXTENSION_ID,
        label: "SilentMessageToggle",
        description: "Control SilentMessageToggle from the command palette.",
        detailCategoryId: SILENT_MESSAGE_TOGGLE_EXTENSION_DETAIL_CATEGORY_ID,
        commandId: "extension-silent-message-toggle-plugin",
        commandLabel: "Toggle SilentMessageToggle",
        commandDescription: "Toggle the SilentMessageToggle plugin.",
        sourcePath: "src/plugins/silentMessageToggle",
        tags: [TAG_PLUGINS, TAG_UTILITY],
        keywords: ["extension", "plugin", "silent", "message", "toggle", "auto disable"]
    },
    {
        id: SCHEDULED_MESSAGES_EXTENSION_ID,
        label: "ScheduledMessages",
        description: "Control ScheduledMessages from the command palette.",
        detailCategoryId: SCHEDULED_MESSAGES_EXTENSION_DETAIL_CATEGORY_ID,
        commandId: "extension-scheduled-messages-open",
        commandLabel: "Open Scheduled Messages",
        commandDescription: "Open the ScheduledMessages modal.",
        sourcePath: "src/equicordplugins/scheduledMessages",
        tags: [TAG_PLUGINS, TAG_UTILITY],
        keywords: ["extension", "plugin", "schedule", "message", "queue", "remind", "delay"]
    },
    {
        id: THEME_LIBRARY_EXTENSION_ID,
        label: "ThemeLibrary",
        description: "Control ThemeLibrary from the command palette.",
        detailCategoryId: THEME_LIBRARY_EXTENSION_DETAIL_CATEGORY_ID,
        commandId: "extension-theme-library-open",
        commandLabel: "Open Theme Library",
        commandDescription: "Open the ThemeLibrary settings page.",
        sourcePath: "src/equicordplugins/themeLibrary",
        tags: [TAG_PLUGINS, TAG_UTILITY],
        keywords: ["extension", "plugin", "theme", "library", "themes", "settings"]
    }
];

export const extensionDefinitionsById = new Map(EXTENSIONS_CATALOG.map(extension => [extension.id, extension]));

export const EQUICORD_REPOSITORY_RAW_BASE_URL = "https://raw.githubusercontent.com/Equicord/Equicord/main";
export const EQUICORD_REPOSITORY_BLOB_BASE_URL = "https://github.com/Equicord/Equicord/blob/main";

export function normalizeRepositoryPath(path: string): string {
    return path.trim().replace(/^\/+/, "");
}

export function toRepositoryBlobUrl(path: string): string {
    const normalizedPath = normalizeRepositoryPath(path);
    return `${EQUICORD_REPOSITORY_BLOB_BASE_URL}/${normalizedPath}`;
}

export function toRepositoryRawUrl(path: string): string {
    const normalizedPath = normalizeRepositoryPath(path);
    return `${EQUICORD_REPOSITORY_RAW_BASE_URL}/${normalizedPath}`;
}

export function getExtensionReadmePaths(extension: ExtensionDefinition): string[] {
    const paths: string[] = [];
    const addPath = (path: string | undefined) => {
        if (!path) return;
        const normalizedPath = normalizeRepositoryPath(path);
        if (!normalizedPath) return;
        if (paths.includes(normalizedPath)) return;
        paths.push(normalizedPath);
    };

    addPath(extension.readmePath);
    if (extension.sourcePath) {
        addPath(`${extension.sourcePath}/README.md`);
        addPath(`${extension.sourcePath}/readme.md`);
    }

    return paths;
}
