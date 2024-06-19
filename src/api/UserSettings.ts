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

import { Settings } from "./Settings";

export interface UserSettingDefinition<T = any> {
    /**
     * Get the setting value
     */
    getSetting: () => T;
    /**
     * Update the setting value
     * @param value The new value
     */
    updateSetting: (value: T | ((old: T) => T)) => Promise<void>;
    /**
     * React hook for automatically updating components when the setting is updated
     */
    useSetting: () => T;

    userSettingApiGroup: string;
    userSettingApiName: string;
}

export const UserSettings: UserSettingDefinition[] | undefined = proxyLazyWebpack(() => {
    const modId = findModuleId('"textAndImages","renderSpoilers"') as any;
    if (modId == null) {
        new Logger("UserSettingsAPI").error("Didn't find settings module.");
        return;
    }

    const mod = wreq(modId);
    if (mod == null) return;

    return Object.values(mod).filter((s: any) => s?.userSettingApiGroup) as any;
});

/**
 * Gets the setting with the given setting group and name
 * @param group The setting group
 * @param name The name of the setting
 */
export function getUserSetting<T = any>(group: string, name: string): UserSettingDefinition<T> | undefined {
    if (!Settings.plugins.UserSettingsAPI!.enabled)
        throw new Error("Cannot use UserSettingsAPI without setting as dependency.");

    return UserSettings?.find(s => s.userSettingApiGroup === group && s.userSettingApiName === name);
}

/**
 * {@link getUserSetting} but lazy
 */
export function getUserSettingLazy<T = any>(group: string, name: string) {
    return proxyLazy(() => getUserSetting<T>(group, name));
}
