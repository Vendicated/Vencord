/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const MAX_FETCH_LIMIT = 5000;
const FETCH_CHUNK_SIZE = 100;
const TEXT_BASED_CHANNEL_TYPES = new Set<number>([0, 1, 3, 5, 10, 11, 12, 15, 16]);
const NON_SYSTEM_MESSAGE_TYPES = new Set<number>([0, 1, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 30]);
const RELATIVE_DATE_PATTERN = /^([+-]?)(\d+)([smhdw])$/i;
const RELATIVE_UNITS: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000
};

export {
    FETCH_CHUNK_SIZE,
    MAX_FETCH_LIMIT,
    NON_SYSTEM_MESSAGE_TYPES,
    RELATIVE_DATE_PATTERN,
    RELATIVE_UNITS,
    TEXT_BASED_CHANNEL_TYPES
};

