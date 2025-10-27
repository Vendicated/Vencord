/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 chev
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";
import { translations } from "./i18n";

const i18nModule = findByPropsLazy("getLocale", "Messages");

type TranslationKey = keyof typeof translations["en"];
type AvailableLocales = keyof typeof translations;

export function getPluginIntlMessage(key: TranslationKey): string {
    const locale = i18nModule.getLocale();
    const availableTranslations = translations[locale as AvailableLocales];
    return availableTranslations?.[key] ?? translations["en"][key] ?? key;
}