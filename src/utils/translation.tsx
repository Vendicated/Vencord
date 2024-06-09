/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { negotiateLanguages } from "@fluent/langneg";
import { React } from "@webpack/common";

import translations from "~translations";

import { localStorage } from "./localStorage";
import { Logger } from "./Logger";

const logger = new Logger("Translations", "#7bc876");

let loadedLocale: Record<string, any>;

let lastDiscordLocale: string = localStorage.getItem("vcLocale")!;
let bestLocale: string;

export function setLocale(locale: string) {
    if (locale === lastDiscordLocale) return;

    localStorage.setItem("vcLocale", locale);

    lastDiscordLocale = locale;

    reloadLocale();
}

if (lastDiscordLocale) reloadLocale();

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
    const getter = (): string => {
        const translation = _t(key, loadedLocale);

        if (typeof translation !== "string") {
            if (!variables || !variables.count) throw new Error(`translation key ${key} is an object (requires plurality?)`);

            if (variables.count) {
                const pluralTag: Intl.LDMLPluralRule = variables.count === 0 ? "zero" :
                    new Intl.PluralRules(bestLocale).select(variables.count);

                if (translation[pluralTag]) {
                    return format(translation[pluralTag]!, variables);
                } else {
                    return format(translation.other, variables);
                }
            }
        }

        if (!variables) return translation as string;

        return format(translation as string, variables);
    };

    // top level support hax (thank you vee!!)
    // tl;dr: this lets you use $t at the top level in objects by simulating a string, a la:
    // {
    //    description: $t("clientTheme.description")
    // }
    // and any future accesses of the description prop will result in an up to date translation
    return {
        __proto__: String.prototype,
        valueOf: getter,
        toString: getter
    } as unknown as string;
}

interface TranslateProps {
    /** The key to translate. */
    i18nKey: string;
    /** The variables to interpolate into the resultant string. If dealing with plurals, `count` must be set. */
    variables?: Record<string, any>;
    /** The component(s) to interpolate into the resultant string. */
    children: JSX.Element | JSX.Element[];
}

/**
 * A translation component. Follows the same rules as {@link $t}, but lets you add components to strings.
 * @param param0 Component props.
 */
export function Translate({ i18nKey, variables, children: trueChildren }: TranslateProps): JSX.Element {
    const children = [trueChildren].flat();

    const translation = $t(i18nKey, variables);

    const parts = translation.split(/(<\d+>.*?<\/\d+>)/g);

    const finalChildren = parts.map((part, index) => {
        const match = part.match(/<(\d+)>(.*?)<\/\d+>/);

        if (match) {
            const childIndex = parseInt(match[1], 10);
            return React.cloneElement(children[childIndex], { key: index }, match[2]);
        }

        return part;
    });

    return <>{finalChildren}</>;
}
