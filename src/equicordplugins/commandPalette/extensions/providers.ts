/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SettingsStore } from "@api/Settings";
import { Toasts } from "@webpack/common";

import { TAG_DEVELOPER, TAG_NAVIGATION, TAG_PLUGINS, TAG_UTILITY } from "../metadata/tags";
import type { CommandEntry, ExtensionDefinition } from "../registry";
import { createHolyNotesExtensionCommands } from "./actions/holyNotes";
import { createRandomVoiceExtensionCommand } from "./actions/randomVoice";
import { createScheduledMessagesExtensionCommands } from "./actions/scheduledMessages";
import { createSilentMessageToggleExtensionCommand } from "./actions/silentMessageToggle";
import { createSilentTypingExtensionCommand } from "./actions/silentTyping";
import { createThemeLibraryExtensionCommand } from "./actions/themeLibrary";
import {
    EXTENSIONS_CATALOG_CATEGORY_ID,
    EXTENSIONS_DETAIL_PROVIDER_ID,
    EXTENSIONS_PACK_PROVIDER_ID,
    HOLY_NOTES_EXTENSION_ID,
    RANDOM_VOICE_EXTENSION_ID,
    SCHEDULED_MESSAGES_EXTENSION_ID,
    SILENT_MESSAGE_TOGGLE_EXTENSION_ID,
    SILENT_TYPING_EXTENSION_ID,
    THEME_LIBRARY_EXTENSION_ID,
    toRepositoryBlobUrl
} from "./catalog";
import type { ExtensionsState } from "./state";

interface ContextCommandProvider {
    id: string;
    getCommands(): CommandEntry[];
    subscribe?(refresh: () => void): () => void;
}

interface ExtensionsProviderDeps {
    extensionsState: ExtensionsState;
    registerContextProvider(provider: ContextCommandProvider): void;
    showToast(message: string, type: (typeof Toasts.Type)[keyof typeof Toasts.Type]): void;
    openExternalUrl(url: string): void;
    executeCommand(entry: CommandEntry): Promise<void>;
    getCommandById(commandId: string): CommandEntry | undefined;
}

function createInstalledExtensionCommands(extensionsState: ExtensionsState): CommandEntry[] {
    const entries: CommandEntry[] = [];

    if (extensionsState.installedExtensionIds.has(SILENT_TYPING_EXTENSION_ID)) {
        entries.push(createSilentTypingExtensionCommand(extensionsState.extensionKeybinds));
    }

    if (extensionsState.installedExtensionIds.has(RANDOM_VOICE_EXTENSION_ID)) {
        entries.push(createRandomVoiceExtensionCommand(extensionsState.extensionKeybinds));
    }

    if (extensionsState.installedExtensionIds.has(HOLY_NOTES_EXTENSION_ID)) {
        entries.push(...createHolyNotesExtensionCommands());
    }

    if (extensionsState.installedExtensionIds.has(SILENT_MESSAGE_TOGGLE_EXTENSION_ID)) {
        entries.push(createSilentMessageToggleExtensionCommand(extensionsState.extensionKeybinds));
    }

    if (extensionsState.installedExtensionIds.has(SCHEDULED_MESSAGES_EXTENSION_ID)) {
        entries.push(...createScheduledMessagesExtensionCommands());
    }

    if (extensionsState.installedExtensionIds.has(THEME_LIBRARY_EXTENSION_ID)) {
        entries.push(createThemeLibraryExtensionCommand());
    }

    return entries;
}

function createExtensionCatalogCommands(extensions: ExtensionDefinition[]): CommandEntry[] {
    return extensions.map(extension => ({
        id: `extension-catalog-${extension.id}`,
        label: extension.label,
        description: extension.description,
        keywords: extension.keywords,
        tags: extension.tags,
        categoryId: EXTENSIONS_CATALOG_CATEGORY_ID,
        hiddenInSearch: true,
        drilldownCategoryId: extension.detailCategoryId,
        handler: () => undefined
    }));
}

function createExtensionDetailCommands(deps: ExtensionsProviderDeps): CommandEntry[] {
    const { extensionsState } = deps;
    const commands: CommandEntry[] = [];

    for (const extension of extensionsState.listExtensions()) {
        const installed = extensionsState.installedExtensionIds.has(extension.id);
        commands.push({
            id: `extension-detail-${extension.id}-install-toggle`,
            label: installed ? "Uninstall Extension" : "Install Extension",
            description: installed
                ? "Removes this plugin command pack from your palette."
                : "Installs this plugin command pack into your palette.",
            keywords: ["install", "uninstall", "extension", extension.label.toLowerCase()],
            categoryId: extension.detailCategoryId,
            hiddenInSearch: true,
            tags: [TAG_PLUGINS, TAG_UTILITY],
            handler: async () => {
                const success = installed
                    ? await extensionsState.uninstall(extension.id)
                    : await extensionsState.install(extension.id);
                if (!success) {
                    deps.showToast(`Failed to ${installed ? "uninstall" : "install"} ${extension.label}.`, Toasts.Type.FAILURE);
                    return;
                }

                deps.showToast(`${installed ? "Uninstalled" : "Installed"} ${extension.label} plugin commands.`, Toasts.Type.SUCCESS);
            }
        });

        if (installed) {
            commands.push({
                id: `extension-detail-${extension.id}-command`,
                label: extension.commandLabel,
                description: extension.commandDescription,
                keywords: ["command", extension.label.toLowerCase(), "plugin", "extension"],
                categoryId: extension.detailCategoryId,
                hiddenInSearch: true,
                tags: [TAG_PLUGINS, TAG_UTILITY],
                handler: async () => {
                    const command = deps.getCommandById(extension.commandId);
                    if (!command) {
                        deps.showToast(`${extension.label} command is unavailable.`, Toasts.Type.FAILURE);
                        return;
                    }
                    await deps.executeCommand(command);
                }
            });
        }

        if (extension.sourcePath) {
            commands.push({
                id: `extension-detail-${extension.id}-source`,
                label: "View Source Code",
                description: "Open extension source code.",
                keywords: ["source", "code", "github", "extension"],
                categoryId: extension.detailCategoryId,
                hiddenInSearch: true,
                tags: [TAG_NAVIGATION, TAG_DEVELOPER],
                handler: () => deps.openExternalUrl(toRepositoryBlobUrl(extension.sourcePath!))
            });
        }
    }

    return commands;
}

export function registerExtensionProviders(deps: ExtensionsProviderDeps) {
    deps.registerContextProvider({
        id: EXTENSIONS_CATALOG_CATEGORY_ID,
        getCommands: () => createExtensionCatalogCommands(deps.extensionsState.listExtensions()),
        subscribe: refresh => {
            void deps.extensionsState.ready.finally(refresh);
            return () => undefined;
        }
    });

    deps.registerContextProvider({
        id: EXTENSIONS_DETAIL_PROVIDER_ID,
        getCommands: () => createExtensionDetailCommands(deps),
        subscribe: refresh => {
            void deps.extensionsState.ready.finally(refresh);
            return () => undefined;
        }
    });

    deps.registerContextProvider({
        id: EXTENSIONS_PACK_PROVIDER_ID,
        getCommands: () => createInstalledExtensionCommands(deps.extensionsState),
        subscribe: refresh => {
            const handler = (_: unknown, path: string) => {
                if (typeof path !== "string") return;
                if (!path.startsWith("plugins.SilentTyping")) return;
                refresh();
            };
            SettingsStore.addGlobalChangeListener(handler);
            void deps.extensionsState.ready.finally(refresh);
            return () => {
                SettingsStore.removeGlobalChangeListener(handler);
            };
        }
    });
}
