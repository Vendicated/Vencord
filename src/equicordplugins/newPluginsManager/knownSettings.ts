/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import plugins from "~plugins";

export type KnownPluginSettingsMap = Map<string, Set<string>>;

export const KNOWN_PLUGINS_LEGACY_DATA_KEY = "NewPluginsManager_KnownPlugins";
export const KNOWN_SETTINGS_DATA_KEY = "NewPluginsManager_KnownSettings";

function getSettingsSetForPlugin(plugin: string): Set<string> {
    const settings = plugins[plugin]?.settings?.def || {};
    return new Set(Object.keys(settings).filter(setting => setting !== "enabled"));
}

function getCurrentSettings(pluginList: string[]): KnownPluginSettingsMap {
    return new Map(pluginList.map(name => [
        name,
        getSettingsSetForPlugin(name)
    ]));
}

export async function getKnownSettings(): Promise<KnownPluginSettingsMap> {
    let map = await DataStore.get(KNOWN_SETTINGS_DATA_KEY) as KnownPluginSettingsMap;
    if (map === undefined) {
        const knownPlugins = await DataStore.get(KNOWN_PLUGINS_LEGACY_DATA_KEY) ?? [] as string[];
        const Plugins = [...Object.keys(plugins), ...knownPlugins];
        map = getCurrentSettings(Plugins);
        DataStore.set(KNOWN_SETTINGS_DATA_KEY, map);
    }
    return map;
}

export async function getNewSettings(): Promise<KnownPluginSettingsMap> {
    const map = getCurrentSettings(Object.keys(plugins));
    const knownSettings = await getKnownSettings();
    map.forEach((settings, plugin) => {
        const filteredSettings = [...settings].filter(setting => !knownSettings.get(plugin)?.has(setting));
        if (!filteredSettings.length) return map.delete(plugin);
        map.set(plugin, new Set(filteredSettings));
    });
    return map;
}

export async function getKnownPlugins(): Promise<Set<string>> {
    const knownSettings = await getKnownSettings();
    return new Set(knownSettings.keys());
}

export async function getNewPlugins(): Promise<Set<string>> {
    const currentPlugins = Object.keys(plugins);
    const knownPlugins = await getKnownPlugins();
    return new Set(currentPlugins.filter(p => !knownPlugins.has(p)));
}

export async function writeKnownSettings() {
    const currentSettings = getCurrentSettings(Object.keys(plugins));
    const knownSettings = await getKnownSettings();
    const allSettings = new Map();
    new Set([...currentSettings.keys(), ...knownSettings.keys()]).forEach(plugin => {
        allSettings.set(plugin, new Set([
            ...(currentSettings.get(plugin) || []),
            ...(knownSettings.get(plugin) || [])
        ]));
    });
    await DataStore.set(KNOWN_SETTINGS_DATA_KEY, allSettings);
}

export async function debugWipeSomeData() {
    const settings = await getKnownSettings();
    settings.forEach((value, key) => {
        if (Math.random() > 0.8) {
            if (Math.random() > 0.5) return settings.set(key, new Set([...value].filter(() => Math.random() > 0.5)));
            return settings.delete(key);
        }
    });
    await DataStore.set(KNOWN_SETTINGS_DATA_KEY, settings);
}

export async function editRawData(patcher: (data: KnownPluginSettingsMap) => (Promise<any> | any)) {
    if (!patcher) return;
    const map = await DataStore.get(KNOWN_SETTINGS_DATA_KEY) as KnownPluginSettingsMap;
    const newMap = new Map(map);
    await patcher(newMap);
    await DataStore.set(KNOWN_SETTINGS_DATA_KEY, newMap ?? map);
}
