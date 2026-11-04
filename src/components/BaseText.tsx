/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Text, TextProps, TextTag } from "./Text";
export * from "./Text";

// #region Old compability

/** @deprecated use `Text` from `@components/Text` instead */
export const BaseText = Text as never;
export type BaseTextProps<Tag extends TextTag = "div"> = TextProps<Tag>;

// #endregion
