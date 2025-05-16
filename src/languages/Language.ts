/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

import { Directories, DirType, LangPack, LangPackType, Languages, LanguageType } from "./LanguageStore";

const logger = new Logger("Language");

export function getText(type: DirType, pluginName?: string) {
    const { language } = VencordNative.settings.get();

    if (!Languages[language as keyof typeof Languages]) {
        logger.error("Error, the wrong language is set in the settings.");
        return {};
    }

    if (type === "api" || type === "components") {
        let loadedText: any;
        try {
            loadedText = LangPack[language][type];
        } catch {
            loadedText = LangPack.en[type];
        }
        return loadedText;

    } else if (type === "plugins") {
        let loadedText: any;
        if (pluginName) {
            try {
                loadedText = LangPack[language][type];
            } catch {
                loadedText = LangPack.en[type];
            }
        }
        return loadedText;
    } else {
        logger.error("Error, not working type");
        return {};
    }
}

export function getLanguage<T extends DirType>(type: T, pluginName?: string): LangPackType<T> {
    try {
        let data: LangPackType<T>;
        if (pluginName) {
            data = getText(type, pluginName);
        } else {
            data = getText(type);
        }
        return data;
    } catch (error) {
        logger.error("Error loading language:", error);
        return {} as LangPackType<T>;
    }
}

export { Directories, DirType, Languages, LanguageType };
