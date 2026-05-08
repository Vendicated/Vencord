/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { genericSettingNames as zhCNGenericSettingNames, messages as zhCNMessages, plugins as zhCNPlugins, pluginTags as zhCNPluginTags } from "./i18n/locales/zh-CN";
import type { LocaleGenericSettingNames, LocaleMessages, LocalePluginTags, PluginTranslation } from "./i18n/types";

export type VencordLocale = "en-US" | "zh-CN";
export type VencordLocaleSetting = "auto" | VencordLocale;

const SupportedLocales = ["en-US", "zh-CN"] as const satisfies readonly VencordLocale[];
const supportedLocaleSet = new Set<string>(SupportedLocales);

export const LocaleOptions = [
    { label: "Automatic (Discord language)", value: "auto", default: true },
    { label: "English", value: "en-US" },
    { label: "简体中文", value: "zh-CN" },
] as const satisfies Array<{ label: string; value: VencordLocaleSetting; default?: boolean; }>;

function isSupportedLocale(locale: unknown): locale is VencordLocale {
    return typeof locale === "string" && supportedLocaleSet.has(locale);
}

const translations = {
    "zh-CN": zhCNMessages,
} satisfies Partial<Record<VencordLocale, LocaleMessages>>;

const pluginTagTranslations = {
    "zh-CN": zhCNPluginTags,
} satisfies Partial<Record<VencordLocale, LocalePluginTags>>;

const genericSettingNameTranslations = {
    "zh-CN": zhCNGenericSettingNames,
} satisfies Partial<Record<VencordLocale, LocaleGenericSettingNames>>;

const pluginTranslations = {
    "zh-CN": zhCNPlugins,
} satisfies Partial<Record<VencordLocale, Record<string, PluginTranslation>>>;

function getCurrentLocale() {
    try {
        const { LocaleStore } = require("@webpack/common") as typeof import("@webpack/common");
        const locale = (LocaleStore as any)?.getLocale?.() ?? LocaleStore?.locale;
        if (locale) return locale;
    } catch { }

    try {
        return navigator.language;
    } catch {
        return "en-US";
    }
}

function normalizeLocale(locale: string): VencordLocale {
    if (/^zh(?:-|$)/i.test(locale)) return "zh-CN";
    return "en-US";
}

export function getConfiguredLocale(): VencordLocaleSetting {
    try {
        const locale = VencordNative.settings.get()?.locale;
        if (locale === "auto" || isSupportedLocale(locale)) return locale;
    } catch { }

    return "auto";
}

export function getEffectiveLocale(): VencordLocale {
    const locale = getConfiguredLocale();
    return locale === "auto" ? normalizeLocale(getCurrentLocale()) : locale;
}

function getMessages() {
    return translations[getEffectiveLocale()];
}

export function isChineseLocale(locale = getEffectiveLocale()) {
    return locale === "zh-CN";
}

export function t(message: string) {
    return getMessages()?.[message] ?? message;
}

export function tPluginTag(tag: string) {
    return pluginTagTranslations[getEffectiveLocale()]?.[tag] ?? tag;
}

export function tPluginDescription(pluginName: string, description: string) {
    const locale = getEffectiveLocale();
    return pluginTranslations[locale]?.[pluginName]?.description
        ?? translations[locale]?.[description]
        ?? description;
}

export function tPluginSettingName(pluginName: string, settingId: string, fallback: string) {
    const locale = getEffectiveLocale();
    return pluginTranslations[locale]?.[pluginName]?.settings?.[settingId]?.name
        ?? genericSettingNameTranslations[locale]?.[settingId]
        ?? translations[locale]?.[fallback]
        ?? fallback;
}

export function tPluginSettingDescription(pluginName: string, settingId: string, description: string) {
    const locale = getEffectiveLocale();
    return pluginTranslations[locale]?.[pluginName]?.settings?.[settingId]?.description
        ?? translations[locale]?.[description]
        ?? description;
}

export function tPluginSettingPlaceholder(pluginName: string, settingId: string, placeholder: string) {
    const locale = getEffectiveLocale();
    return pluginTranslations[locale]?.[pluginName]?.settings?.[settingId]?.placeholder
        ?? translations[locale]?.[placeholder]
        ?? placeholder;
}

export function tPluginSettingOption(pluginName: string, settingId: string, label: string) {
    const locale = getEffectiveLocale();
    return pluginTranslations[locale]?.[pluginName]?.settings?.[settingId]?.options?.[label]
        ?? translations[locale]?.[label]
        ?? label;
}
