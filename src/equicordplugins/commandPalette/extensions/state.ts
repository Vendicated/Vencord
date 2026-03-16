/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import {
    DEFAULT_EXTENSION_KEYBINDS,
    EXTENSION_KEYBINDS_KEY,
    extensionDefinitionsById,
    EXTENSIONS_CATALOG,
    EXTENSIONS_DETAIL_PROVIDER_ID,
    EXTENSIONS_PACK_PROVIDER_ID,
    getExtensionReadmePaths,
    INSTALLED_EXTENSIONS_KEY,
    toRepositoryRawUrl
} from "./catalog";
import type { ExtensionKeybindMap } from "./types";

export interface ExtensionsState {
    ready: Promise<void>;
    installedExtensionIds: Set<string>;
    extensionKeybinds: Map<string, ExtensionKeybindMap>;
    listExtensions(): typeof EXTENSIONS_CATALOG;
    isInstalled(extensionId: string): boolean;
    install(extensionId: string): Promise<boolean>;
    uninstall(extensionId: string): Promise<boolean>;
    getAvailableReadmePath(extensionId: string): string | null;
    ensureAllFileChecks(): void;
}

function toExtensionKeybindRecord(extensionKeybinds: Map<string, ExtensionKeybindMap>) {
    const record: Record<string, ExtensionKeybindMap> = {};
    for (const [extensionId, keybinds] of extensionKeybinds) {
        record[extensionId] = keybinds;
    }
    return record;
}

async function checkExtensionFileExists(path: string): Promise<boolean> {
    const rawUrl = toRepositoryRawUrl(path);
    const headResponse = await fetch(rawUrl, { method: "HEAD" }).catch(() => null);
    if (headResponse?.ok) return true;
    if (headResponse?.status === 404) return false;

    const getResponse = await fetch(rawUrl).catch(() => null);
    return getResponse?.ok ?? false;
}

export function createExtensionsState(
    refreshContextProvider: (id: string) => void,
    bumpRegistryVersion: () => void
): ExtensionsState {
    const installedExtensionIds = new Set<string>();
    const extensionKeybinds = new Map<string, ExtensionKeybindMap>();
    const extensionFileAvailability = new Map<string, boolean>();
    const extensionFileCheckInflight = new Set<string>();

    const persistInstalledExtensions = async () => {
        try {
            await DataStore.set(INSTALLED_EXTENSIONS_KEY, Array.from(installedExtensionIds));
        } catch {
            return;
        }
    };

    const persistExtensionKeybinds = async () => {
        try {
            await DataStore.set(EXTENSION_KEYBINDS_KEY, toExtensionKeybindRecord(extensionKeybinds));
        } catch {
            return;
        }
    };

    const ensureExtensionFileCheck = (path?: string) => {
        if (!path) return;

        if (extensionFileAvailability.has(path)) return;
        if (extensionFileCheckInflight.has(path)) return;

        extensionFileCheckInflight.add(path);
        void checkExtensionFileExists(path)
            .then(exists => {
                extensionFileAvailability.set(path, exists);
                refreshContextProvider(EXTENSIONS_DETAIL_PROVIDER_ID);
            })
            .finally(() => {
                extensionFileCheckInflight.delete(path);
            });
    };

    const ensureAllFileChecks = () => {
        for (const extension of EXTENSIONS_CATALOG) {
            for (const path of getExtensionReadmePaths(extension)) {
                ensureExtensionFileCheck(path);
            }
        }
    };

    const ready = (async () => {
        try {
            const storedInstalled = await DataStore.get<string[]>(INSTALLED_EXTENSIONS_KEY);
            if (Array.isArray(storedInstalled)) {
                for (const extensionId of storedInstalled) {
                    if (!extensionDefinitionsById.has(extensionId)) continue;
                    installedExtensionIds.add(extensionId);
                }
            }
        } catch {
            return;
        }

        try {
            const storedKeybinds = await DataStore.get<Record<string, ExtensionKeybindMap>>(EXTENSION_KEYBINDS_KEY);
            for (const extension of EXTENSIONS_CATALOG) {
                const stored = storedKeybinds?.[extension.id];
                if (stored?.secondaryActionChord && stored.tertiaryActionChord) {
                    extensionKeybinds.set(extension.id, stored);
                    continue;
                }

                const fallback = DEFAULT_EXTENSION_KEYBINDS[extension.id];
                if (fallback) {
                    extensionKeybinds.set(extension.id, fallback);
                }
            }
        } catch {
            return;
        } finally {
            ensureAllFileChecks();
            refreshContextProvider(EXTENSIONS_PACK_PROVIDER_ID);
            refreshContextProvider(EXTENSIONS_DETAIL_PROVIDER_ID);
            bumpRegistryVersion();
        }
    })();

    return {
        ready,
        installedExtensionIds,
        extensionKeybinds,
        listExtensions: () => EXTENSIONS_CATALOG,
        isInstalled: extensionId => installedExtensionIds.has(extensionId),
        install: async extensionId => {
            await ready;
            if (!extensionDefinitionsById.has(extensionId)) return false;
            if (installedExtensionIds.has(extensionId)) return true;

            installedExtensionIds.add(extensionId);
            if (!extensionKeybinds.has(extensionId) && DEFAULT_EXTENSION_KEYBINDS[extensionId]) {
                extensionKeybinds.set(extensionId, DEFAULT_EXTENSION_KEYBINDS[extensionId]);
            }

            await Promise.all([
                persistInstalledExtensions(),
                persistExtensionKeybinds()
            ]);

            refreshContextProvider(EXTENSIONS_PACK_PROVIDER_ID);
            refreshContextProvider(EXTENSIONS_DETAIL_PROVIDER_ID);
            bumpRegistryVersion();
            return true;
        },
        uninstall: async extensionId => {
            await ready;
            if (!extensionDefinitionsById.has(extensionId)) return false;
            if (!installedExtensionIds.has(extensionId)) return true;

            installedExtensionIds.delete(extensionId);
            extensionKeybinds.delete(extensionId);

            await Promise.all([
                persistInstalledExtensions(),
                persistExtensionKeybinds()
            ]);

            refreshContextProvider(EXTENSIONS_PACK_PROVIDER_ID);
            refreshContextProvider(EXTENSIONS_DETAIL_PROVIDER_ID);
            bumpRegistryVersion();
            return true;
        },
        getAvailableReadmePath: extensionId => {
            const extension = extensionDefinitionsById.get(extensionId);
            if (!extension) return null;
            for (const path of getExtensionReadmePaths(extension)) {
                if (extensionFileAvailability.get(path) === true) return path;
            }
            return null;
        },
        ensureAllFileChecks
    };
}
