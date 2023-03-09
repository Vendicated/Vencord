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

import { find, findLazy } from "@webpack";

interface Setting<T> {
    /**
     * Get the setting value
     */
    getSetting(): T;
    /**
     * Update the setting value
     * @param value The new value
     */
    updateSetting(value: T): Promise<void>;
    /**
     * React hook for automatically updating components when the setting is updated
     */
    useSetting(): boolean;
}

/**
 * Get the store for a setting
 * @param group The setting group
 * @param name The name of the setting
 */
export function getSettingStore<T = any>(group: string, name: string): Setting<T> | undefined {
    return find(m => m?.settingsStoreApiGroup === group && m?.settingsStoreApiName === name);
}

/**
 * getSettingStore but lazy
 */
export function getSettingStoreLazy<T = any>(group: string, name: string): Setting<T> | undefined {
    return findLazy(m => m?.settingsStoreApiGroup === group && m?.settingsStoreApiName === name);
}
