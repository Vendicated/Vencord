/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluentBundle, FluentResource, type FluentVariable } from "@fluent/bundle";
import { negotiateLanguages } from "@fluent/langneg";
import { mapBundleSync } from "@fluent/sequence";
import { FluxDispatcher, i18n } from "@webpack/common";

import translations from "~translations";

import { Logger } from "./Logger";

// same color as pontoon's logo
const logger = new Logger("Translations", "#7bc876");

let subscribed = false;

let bundleCache: Record<string, FluentBundle[]> = {};
let messageCache: Record<string, Record<string, FluentBundle>> = {};

/**
 * Gets a function that translates strings.
 * @param context The context to use for translation (e.g., `vencord`).
 * @returns A function that allows translation.
 */
export function getTranslations(context: string) {
    if (!translations[context]) throw new Error(`No translations for ${context}`);

    if (!subscribed) {
        let lastLocale = i18n.getLocale();

        FluxDispatcher.subscribe("USER_SETTINGS_PROTO_UPDATE", ({ settings }) => {
            if (settings.proto.localization.locale.value !== lastLocale) {
                // locale was updated, clear our caches

                lastLocale = settings.proto.localization.locale.value;

                bundleCache = {};
                messageCache = {};
            }
        });

        subscribed = true;
    }

    /**
     * Translates a key. Soft-fails and returns a fallback error string if the key could not be loaded.
     * @param key The key to translate.
     * @param variables The variables to interpolate into the resultant string.
     * @returns A translated string.
     */
    return function t(key: string, variables?: Record<string, FluentVariable>): string {
        const msgCache = messageCache[context] ??= {};

        // adding the caching here speeds up retrieving translations for this key later
        if (msgCache[key]) {
            const bundle = msgCache[key];
            return bundle.formatPattern(bundle.getMessage(key)!.value!, variables);
        }

        const localeCache = bundleCache[context] ??= [];

        // we've never loaded this context's translations
        if (localeCache.length === 0) {
            const availableLocales = Object.keys(translations[context]);

            const locale = i18n.getLocale();

            const supportedLocales = negotiateLanguages([locale], availableLocales, { defaultLocale: "en-US" });

            for (const locale of supportedLocales) {
                const glossaryResource = new FluentResource(translations.glossary[locale]);
                const resource = new FluentResource(translations[context][locale]);

                const fluentBundle = new FluentBundle(locale);

                // the glossary is always loaded first
                fluentBundle.addResource(glossaryResource);

                const errors = fluentBundle.addResource(resource);

                if (errors.length) {
                    logger.warn("Translations for", context, "in locale", locale, "loaded with errors:", errors);
                }

                localeCache.push(fluentBundle);
            }
        }

        const bundle = mapBundleSync(localeCache, key);

        if (!bundle) return "Could not get translation for " + key;

        const message = bundle.getMessage(key);
        if (message?.value) {
            msgCache[key] = bundle;
            return bundle.formatPattern(message.value, variables);
        }

        return "Could not get translation for " + key;
    };
}
