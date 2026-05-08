/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type LocaleMessages = Record<string, string>;
export type LocalePluginTags = Record<string, string>;
export type LocaleGenericSettingNames = Record<string, string>;

export type PluginSettingTranslation = {
    name?: string;
    description?: string;
    placeholder?: string;
    options?: Record<string, string>;
};

export type PluginTranslation = {
    description?: string;
    settings?: Record<string, PluginSettingTranslation>;
};
