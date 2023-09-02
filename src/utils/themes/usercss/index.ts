/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { parse as originalParse, UserstyleHeader } from "usercss-meta";

export function parse(text: string, fileName: string): UserstyleHeader {
    const { metadata } = originalParse(text.replace(/\r/g, ""));
    return {
        ...metadata,
        fileName,
    };
}
