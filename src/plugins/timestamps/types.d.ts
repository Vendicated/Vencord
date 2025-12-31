/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface findResult {
    prefix: string | null;
    date: Date;
    index: number;
    length: number;
    nextIndex: number;
}
export interface findPrefixResult {
    prefix: string;
    index: number;
    length: number;
    nextIndex: number;
}
export interface findTextResult {
    text: string;
    offset: number;
    index: number;
    length: number;
    nextIndex: number;
}
export interface findDateResult {
    year: number;
    month: number;
    day: number;
    index: number;
    length: number;
    nextIndex: number;
}
export interface findTimeResult {
    hour: number;
    minute: number;
    second: number;
    ms: number;
    index: number;
    length: number;
    nextIndex: number;
}
export interface TooltipData {
    lastClick: Date;
    index: number;
    message: string;
}
