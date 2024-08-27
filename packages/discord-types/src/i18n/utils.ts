/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ParserRules } from "simple-markdown";

import type { Nullish } from "../internal";
import type { FormattedMessage, FormattedMessageArgs } from "./FormattedMessage";

// For getSystemLocale
export type SystemLocaleGetter = () => string;

// For setUpdateRules
export type UpdateRulesSetter = (updater: (rules: ParserRules) => ParserRules) => void;

// For getMessage
export interface MessageFactory {
    <Args extends FormattedMessageArgs = FormattedMessageArgs, Markdown extends boolean = boolean>(
        message: string,
        locales?: string | readonly string[]
    ): FormattedMessage<Args, Markdown>;
    (message?: Nullish, locales?: string | readonly string[]): "";
}
