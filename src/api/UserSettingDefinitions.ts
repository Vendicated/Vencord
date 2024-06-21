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

import { proxyLazy } from "@utils/lazy";
import { findByFactoryCode } from "@webpack";

import { Settings } from "./Settings";

interface UserSettingDefinition<T> {
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
     * Update the setting value
     * @param value A callback that accepts the old value as the first argument, and returns the new value
     */
    updateSetting(value: (old: T) => T): Promise<void>;
    /**
     * Stateful React hook for this setting value
     */
    useSetting(): T;
    userSettingDefinitionsAPIGroup: string;
    userSettingDefinitionsAPIName: string;
}

export const UserSettingsDefinitions = findByFactoryCode<Record<PropertyKey, UserSettingDefinition<any>>>('"textAndImages","renderSpoilers"');

/**
 * Get the definition for a setting.
 *
 * @param group The setting group
 * @param name The name of the setting
 */
export function getUserSettingDefinition<T = any>(group: string, name: string): UserSettingDefinition<T> | undefined {
    if (!Settings.plugins.UserSettingDefinitionsAPI.enabled) throw new Error("Cannot use UserSettingDefinitionsAPI without setting as dependency.");

    for (const key in UserSettingsDefinitions) {
        const userSettingDefinition = UserSettingsDefinitions[key];

        if (userSettingDefinition.userSettingDefinitionsAPIGroup === group && userSettingDefinition.userSettingDefinitionsAPIName === name) {
            return userSettingDefinition;
        }
    }
}

/**
 * Lazy version of {@link getUserSettingDefinition}
 *
 * Get the definition for a setting.
 *
 * @param group The setting group
 * @param name The name of the setting
 */
export function getUserSettingDefinitionLazy<T = any>(group: string, name: string) {
    return proxyLazy(() => getUserSettingDefinition<T>(group, name));
}
