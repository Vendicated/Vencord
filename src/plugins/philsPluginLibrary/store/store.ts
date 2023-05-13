/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Settings, useSettings } from "@api/Settings";

export type PluginSettings = {
    [key: string]: any;
};

export type PluginUse<Z extends PluginSettings> = () => Z;
export type PluginGet<Z extends PluginSettings> = () => Z;
export type PluginSet<Z extends PluginSettings> = (s: Z | ((settings: Z) => Z | undefined)) => Z;
export type PluginInitializer<Z extends PluginSettings, T = Z> = (set: PluginSet<Z>, get: PluginGet<Z>) => T;
export interface PluginStore<Z extends PluginSettings> {
    use: PluginUse<Z>,
    get: PluginGet<Z>,
    set: PluginSet<Z>;
}

export function createPluginStore<Z extends PluginSettings = {}>(pluginName: string, storeName: string, f: PluginInitializer<Z>): PluginStore<Z> {
    if (!Settings.plugins[pluginName])
        throw new Error("The specified plugin does not exist");

    if (!Settings.plugins[pluginName].stores)
        Settings.plugins[pluginName].stores = {};

    const get: PluginGet<Z> = () => Settings.plugins[pluginName].stores[storeName] as Z;
    const set: PluginSet<Z> = (s: ((settings: Z) => Z | undefined) | Z) =>
        Settings.plugins[pluginName].stores[storeName] = (typeof s === "function" ? s(get()) : s) || get();
    const use: PluginUse<Z> = () => useSettings().plugins[pluginName].stores[storeName] as Z;

    set({ ...f(set, get), ...Settings.plugins[pluginName].stores[storeName] });

    return {
        use,
        get,
        set
    };
}
