/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FormattedMessage } from "./FormattedMessage";

type GenericMessages<Key extends PropertyKey = PropertyKey> = Record<Key, string | FormattedMessage>;

export declare class Provider<Messages extends GenericMessages<never> = GenericMessages> {
    constructor(getParsedMessages: ProviderParsedMessagesGetter<Messages>);

    getMessages(): this["_parsedMessages"];
    refresh(context: ProviderContext<keyof Messages>): void;

    _context: ProviderContext<keyof Messages>;
    _createProxy: (
        context?: ProviderContext<keyof Messages> | undefined /* = this._context */
    ) => Messages & Record<PropertyKey, string>;
    _getParsedMessages: ProviderParsedMessagesGetter<Messages>;
    /**
     * Values will never be undefined.
     * @see {@link https://github.com/microsoft/TypeScript/issues/47594}
     */
    _parsedMessages: Messages & Record<PropertyKey, string>;
}

export interface ProviderContext<MessageKeys extends PropertyKey = PropertyKey> {
    defaultMessages: Partial<Record<MessageKeys, string>>;
    locale: string;
    messages: Partial<Record<MessageKeys, string>>;
}

export type ProviderParsedMessagesGetter<
    Messages extends GenericMessages<never> = GenericMessages
> = <Key extends PropertyKey>(
    context: ProviderContext<keyof Messages>,
    key: Key,
    createProxy: Provider<Messages>["_createProxy"]
) => Key extends keyof Messages ? Messages[Key] : string;
