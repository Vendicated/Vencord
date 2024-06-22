/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { EventEmitter } from "events";
import type { ReactRules } from "simple-markdown";

import type { Nullish } from "../../internal";
import type { FormattedMessage } from "./FormattedMessage";
import type { I18NMessages } from "./I18NMessages";
import type { Provider, ProviderParsedMessagesGetter } from "./Provider";

export declare class I18N<
    Messages extends Record<never, string | FormattedMessage> = I18NMessages,
    Async extends boolean = boolean
> extends EventEmitter {
    constructor(options: {
        getLanguages: () => I18NLanguage[];
        getMessages: I18NMessagesGetter<keyof Messages, Async>;
        initialLocale?: string | Nullish /* = this.getDefaultLocale() */;
    });

    /**
     * @throws {Error} If argument `defaultMessages` is omitted, the messages for the given locale must be loaded.
     */
    _applyMessagesForLocale(
        messages: Record<keyof Messages, string>,
        locale: string,
        defaultMessages?: Record<keyof Messages, string> | undefined /* = this._findMessages() */
    ): void;
    _fetchMessages(locale: string): ReturnType<this["_getMessages"]>;
    /**
     * @throws {Error} The messages for the given locale must be loaded.
     */
    _findMessages(locale: string): Record<keyof Messages, string>;
    _loadMessagesForLocale(locale: string): void;
    getAvailableLocales(): I18NLocale[];
    getDefaultLocale(): string;
    getLanguages(): this["_languages"];
    getLocale(): this["_chosenLocale"];
    getLocaleInfo(): I18NLanguage;
    setLocale(locale: string): void;
    setUpdateRules(updateRules: (rules: ReactRules) => ReactRules): void;
    updateMessagesForExperiment(
        locale: string,
        updater: (messages: Record<keyof Messages, string>) => Record<keyof Messages, string>
    ): void;

    _chosenLocale: string;
    _getMessages: I18NMessagesGetter<keyof Messages, Async>;
    _getParsedMessages: ProviderParsedMessagesGetter;
    _handleNewListener: (eventType: string | number) => void;
    _languages: I18NLanguage[];
    _provider: Provider<Messages>;
    _requestedLocale: string | undefined;
    initialLanguageLoad: Promise<void>;
    loadPromise: Promise<void>;
    /**
     * Values will never be undefined.
     * @see {@link https://github.com/microsoft/TypeScript/issues/47594}
     */
    Messages: I18NMessages & Record<PropertyKey, string>;
    resolveLanguageLoaded: () => void;
}

export type I18NMessagesGetter<
    MessagesKeys extends PropertyKey = PropertyKey,
    Async extends boolean = boolean
> = (locale: string) => Async extends true
    ? Promise<Record<MessagesKeys, string>>
    : Record<MessagesKeys, string>;

export interface I18NLanguage {
    code: string;
    enabled: boolean;
    enabledAPI?: boolean;
    englishName: string;
    name: string;
    postgresLang: string;
}

export interface I18NLocale {
    localizedName: string;
    name: string;
    /** Locale identifier */
    value: string;
}
