/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

type Rule = Record<"find" | "replace" | "onlyIfIncludes" | "id", string> & Record<"isRegex" | "isEnabled", boolean>;

export { Rule };
