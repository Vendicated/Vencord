/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import plugins from "~plugins";

export const KNOWN_PLUGINS_DATA_KEY = "NewPluginsManager_KnownPlugins";

export async function getKnownPlugins(): Promise<Set<string>> {
    let knownPlugins = await DataStore.get(KNOWN_PLUGINS_DATA_KEY) as string[];
    if (knownPlugins === undefined) {
        knownPlugins = Object.keys(plugins);
        DataStore.set(KNOWN_PLUGINS_DATA_KEY, knownPlugins);
    }
    return new Set(knownPlugins);
}

export async function getNewPlugins(): Promise<Set<string>> {
    const currentPlugins = Object.keys(plugins);
    const knownPlugins = await getKnownPlugins();
    return new Set(currentPlugins.filter(p => !knownPlugins.has(p)));
}

export async function writeKnownPlugins(): Promise<void> {
    const currentPlugins = Object.keys(plugins);
    const knownPlugins = await getKnownPlugins();
    DataStore.set(KNOWN_PLUGINS_DATA_KEY, [...new Set([...currentPlugins, ...knownPlugins])]);
}
