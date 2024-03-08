/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SettingsStore<T = any> {
    getSetting(): T;
    updateSetting(value: T): void;
    useSetting(): T;
}
