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
import { Logger } from "@utils/Logger";
import { findModuleId, proxyLazyWebpack, wreq } from "@webpack";

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
    userSettingsAPIGroup: string;
    userSettingsAPIName: string;
}

export const UserSettings: Record<PropertyKey, UserSettingDefinition<any>> | undefined = proxyLazyWebpack(() => {
    const modId = findModuleId('"textAndImages","renderSpoilers"');
    if (modId == null) return new Logger("UserSettingsAPI ").error("Didn't find settings module.");

    return wreq(modId as any);
});

/**
 * Get the setting with the given setting group and name.
 *
 * @param group The setting group
 * @param name The name of the setting
 */
export function getUserSetting<T = any>(group: string, name: string): UserSettingDefinition<T> | undefined {
    if (!Vencord.Plugins.isPluginEnabled("UserSettingsAPI")) throw new Error("Cannot use UserSettingsAPI without setting as dependency.");

    for (const key in UserSettings) {
        const userSetting = UserSettings[key];

        if (userSetting.userSettingsAPIGroup === group && userSetting.userSettingsAPIName === name) {
            return userSetting;
        }
    }
}

/**
 * {@link getUserSettingDefinition}, lazy.
 *
 * Get the setting with the given setting group and name.
 *
 * @param group The setting group
 * @param name The name of the setting
 */
export function getUserSettingLazy<T = any>(group: string, name: string) {
    return proxyLazy(() => getUserSetting<T>(group, name));
}
