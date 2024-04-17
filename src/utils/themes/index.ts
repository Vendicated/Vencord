/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { UserstyleHeader } from "usercss-meta";

import type { UserThemeHeader } from "./bd";

export type ThemeHeader = {
    type: "other";
    header: UserThemeHeader;
} | {
    type: "usercss";
    header: UserstyleHeader;
};
