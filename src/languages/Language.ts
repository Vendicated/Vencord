/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

import { Directories, DirType, LangPack, LangPackType, language, Languages, LanguageType } from "./LanguageStore";

const logger = new Logger("Language");

export function getText(type: DirType) {
    if (!Languages[language as keyof typeof Languages]) throw new Error("Error, the wrong language is set in the settings.");
    if (!Directories[type as keyof typeof Languages]) throw new Error("Error, not working directory type");

    let loadedText: any;
    if (!LangPack[language][type]) loadedText = LangPack.en[type];

    loadedText = LangPack[language][type];
    return loadedText;
}

export function getLanguage<T extends DirType>(type: T): LangPackType<T> {
    try {
        const data = getText(type);
        return data;
    } catch (error) {
        logger.error("Error loading language:", error);
        return {} as LangPackType<T>;
    }
}

export function defineLanguage<L>(pluginName: string, langData: Partial<Record<LanguageType, L>>): L {
    if (!pluginName || !langData) throw new Error("Plugin name or language data not found");

    const plName = pluginName.charAt(0).toLowerCase() + pluginName.slice(1);

    const data = langData[language];
    if (!data || Object.keys(data).length === 0) {
        const langPlugins = LangPack[language].plugins;
        if (!langPlugins[plName]) throw new Error("No language pack found with this plugin name");

        if (langPlugins) {
            return langPlugins[plName] as L;
        }

        return LangPack.en.plugins[plName] as L;
    }
    return data;
}

export { DirType, Languages, LanguageType };
