/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { negotiateLanguages } from "@fluent/langneg";
import { FluxDispatcher, i18n } from "@webpack/common";

import translations from "~translations";

import { Logger } from "./Logger";

const logger = new Logger("Translations", "#7bc876");

let loadedLocale: Record<string, any>;

let lastDiscordLocale = i18n.getLocale();
let bestLocale: string;

FluxDispatcher.subscribe("USER_SETTINGS_PROTO_UPDATE", ({ settings }) => {
    if (settings.proto.localization.locale.value !== lastDiscordLocale) {
        lastDiscordLocale = settings.proto.localization.locale.value;

        reloadLocale();
    }
});

reloadLocale();

function reloadLocale() {
    // finds the best locale based on the available ones
    bestLocale = negotiateLanguages(
        [lastDiscordLocale],
        Object.keys(translations),
        {
            defaultLocale: "en",
            strategy: "lookup",
        }
    )[0];

    loadedLocale = translations[bestLocale];

    logger.info("Changed locale to", bestLocale);
}

// derived from stackoverflow's string formatting function
function format(source: string, variables: Record<string, any>) {
    for (const key in variables) {
        let formatted: string;

        switch (typeof variables[key]) {
            case "number": {
                formatted = new Intl.NumberFormat(bestLocale).format(variables[key]);
                break;
            }

            default: {
                formatted = variables[key].toString();
                break;
            }
        }

        source = source.replace(
            new RegExp(`\\{${key}\\}`, "gi"),
            formatted
        );
    }

    return source;
}

// converts a dot-notation path to an object value
function getByPath(key: string, object: any) {
    try {
        return key.split(".").reduce((obj, key) => obj[key], object);
    } catch {
        // errors if the object doesn't contain the key
        return undefined;
    }
}

type Translation = string | ({ [rule in Intl.LDMLPluralRule]?: string } & { other: string; });

// translation retrieval function
function _t(key: string, bundle: any): Translation {
    const translation = getByPath(key, bundle);

    if (!translation) {
        if (bundle !== translations.en) {
            return _t(key, translations.en);
        } else {
            return key;
        }
    }

    return translation;
}

/**
 * Translates a key. Soft-fails and returns the key if it is not valid.
 * @param key The key to translate.
 * @param variables The variables to interpolate into the resultant string. If dealing with plurals, `count` must be set.
 * @returns A translated string.
 */
export function $t(key: string, variables?: Record<string, any>): string {
    const translation = _t(key, loadedLocale);

    if (typeof translation !== "string") {
        if (!variables || !variables.count) throw new Error(`translation key ${key} is an object (requires plurality?)`);

        if (variables.count) {
            const pluralTag = new Intl.PluralRules(bestLocale).select(variables.count);

            if (translation[pluralTag]) {
                return format(translation[pluralTag]!, variables);
            } else {
                return format(translation.other, variables);
            }
        }
    }

    if (!variables) return translation as string;

    return format(translation as string, variables);
}
