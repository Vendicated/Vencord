/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import en from "./en";
import ru from "./ru";

export const Directories = {
    api: "api",
    components: "components",
    plugins: "plugins",
} as const;

export const Languages = {
    en: "English",
    ru: "Русский",
} as const;

export type LanguageType = keyof typeof Languages;
export type DirType = keyof typeof Directories;

type langPackSample = {
    api: typeof en.api;
    components: typeof en.components;
    plugins: typeof en.plugins.default;
};

export type LangPackType<T extends DirType> = typeof LangPack.en[T];

export const LangPack: Record<LanguageType, langPackSample> = {
    en: {
        api: en.api,
        components: en.components,
        plugins: en.plugins.default,
    },
    ru: {
        api: ru.api,
        components: ru.components,
        plugins: ru.plugins.default,
    }
};

export type PluginsLangDataType = Partial<Record<LanguageType, any>>;
export const { language } = VencordNative.settings.get();
