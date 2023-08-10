/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { Logger } from "@utils/Logger";
import { findModuleId, wreq } from "@webpack";

import { Settings } from "./Settings";

interface Setting<T> {
    /**
     * Get the setting value
     */
    getSetting(): T;
    /**
     * Update the setting value
     * @param value The new value
     */
    updateSetting(value: T | ((old: T) => T)): Promise<void>;
    /**
     * React hook for automatically updating components when the setting is updated
     */
    useSetting(): T;
    settingsStoreApiGroup: string;
    settingsStoreApiName: string;
}

const SettingsStores: Array<Setting<any>> | undefined = proxyLazy(() => {
    const modId = findModuleId('"textAndImages","renderSpoilers"');
    if (modId == null) return new Logger("SettingsStoreAPI").error("Didn't find stores module.");

    const mod = wreq(modId);
    if (mod == null) return;

    return Object.values(mod).filter((s: any) => s?.settingsStoreApiGroup) as any;
});

/**
 * Get the store for a setting
 * @param group The setting group
 * @param name The name of the setting
 */
export function getSettingStore<T = any>(group: string, name: string): Setting<T> | undefined {
    if (!Settings.plugins.SettingsStoreAPI.enabled) throw new Error("Cannot use SettingsStoreAPI without setting as dependency.");

    return SettingsStores?.find(s => s?.settingsStoreApiGroup === group && s?.settingsStoreApiName === name);
}

/**
 * getSettingStore but lazy
 */
export function getSettingStoreLazy<T = any>(group: string, name: string) {
    return proxyLazy(() => getSettingStore<T>(group, name));
}
