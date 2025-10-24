/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { negotiateLanguages } from "@fluent/langneg";
import { React } from "@webpack/common";
import type { JSX } from "react";

import translations, { type TranslationBundle } from "~translations";

import { localStorage } from "./localStorage";
import { Logger } from "./Logger";

const logger = new Logger("Translations", "#7bc876");

export const availableLocales = Object.keys(translations);

let loadedLocale: TranslationBundle;

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

    logger.info(`Locale was updated (wanted ${lastDiscordLocale}, negotiated to ${bestLocale})`);
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
const dotProp = (key: string, object: any) =>
    key.split(".").reduce((obj, key) => obj?.[key], object);

// translation retrieval function
function _t(key: string, bundle: TranslationBundle): string | undefined {
    const translation = dotProp(key, bundle);

    if (typeof translation !== "string")
        return undefined;

    if (!translation) {
        if (bundle !== translations.en) {
            return _t(key, translations.en);
        } else {
            return undefined;
        }
    }

    return translation;
}

/**
 * Translates a key. Soft-fails and returns the key if it is not valid.
 * @param key The key to translate.
 * @param variables The variables to interpolate into the resultant string. If dealing with plurals, `count` must be set.
 * @returns A translated string, or the translation key if it is not valid.
 */
export function t(key: string, variables?: Record<string, any>): string {
    const getter = (): string => {
        if (typeof variables?.count === "number") {
            // this seems plural!
            const pluralTag: Intl.LDMLPluralRule = variables.count === 0 ? "zero" :
                new Intl.PluralRules(bestLocale).select(variables.count);

            const translation = _t(`${key}_${pluralTag}`, loadedLocale);

            if (typeof translation === "string") {
                return format(translation, variables);
            }

            // ...okay, maybe this form just isn't in this translation, try the "other" tag
            const otherTranslation = _t(`${key}_other`, loadedLocale);

            if (typeof otherTranslation === "string") {
                return format(otherTranslation, variables);
            }

            // okay then, nevermind...
        }

        const translation = _t(key, loadedLocale);

        if (!translation) return key; // for easier debugging

        if (!variables) return translation;

        return format(translation, variables);
    };

    // top level support hax (thank you vee!!)
    // tl;dr: this lets you use t at the top level in objects by simulating a string, a la:
    // {
    //    description: t("somePlugin.description")
    // }
    // and any future accesses of the description prop will result in an up to date translation
    const descriptor = {
        configurable: true,
        enumerable: false,
        writable: false,
        value: getter
    };

    return Object.create(String.prototype, {
        toString: descriptor,
        valueOf: descriptor
    });
}

type TranslatableChild = (string | JSX.Element);
interface TranslateProps {
    /** The key to translate. */
    i18nKey: string;
    /** The variables to interpolate into the resultant string. If dealing with plurals, `count` must be set. */
    variables?: Record<string, any>;
    /** The component(s) to interpolate into the resultant string. */
    children: TranslatableChild | TranslatableChild[];
}

/**
 * A translation component. Follows the same rules as {@link t}, but lets you add components to strings.
 *
 * It's worth noting components cannot have components inside of them as their children will be replaced with the string
 * contents of the translation. If you want to do this, you will need to make a wrapper component that accepts a string
 * child.
 *
 * @example
 * ```
 * // you can either do it plainly:
 * <Translate i18nKey="vencord.website">
 *     <Link href="https://vencord.dev" />
 * </Translate>
 *
 * // or, if you want to add some context:
 * <Translate i18nKey="vencord.website">
 *     Would you like to see our <Link href="https://vencord.dev">website</Link>?
 * </Translate>
 *
 * // string children are simply ignored by the component, so you don't have to keep it up to date with the translation
 * ```
 * @param param0 Component props.
 */
export function Translate({ i18nKey, variables, children: trueChildren }: TranslateProps): JSX.Element {
    const children = [trueChildren].flat().filter(child => typeof child !== "string");

    const translation = t(i18nKey, variables);

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
