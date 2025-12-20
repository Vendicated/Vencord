/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { Logger } from "@utils/Logger";
import { findModuleId, proxyLazyWebpack, wreq } from "@webpack";

import { isPluginEnabled } from "./PluginManager";

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
    if (modId == null) return new Logger("UserSettingsAPI").error("Didn't find settings module.");

    return wreq(modId as any);
});

/**
 * Get the setting with the given setting group and name.
 *
 * @param group The setting group
 * @param name The name of the setting
 */
export function getUserSetting<T = any>(group: string, name: string): UserSettingDefinition<T> | undefined {
    if (!isPluginEnabled("UserSettingsAPI")) throw new Error("Cannot use UserSettingsAPI without setting it as a dependency.");

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
