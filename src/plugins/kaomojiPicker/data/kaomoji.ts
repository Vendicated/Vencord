/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { userKaomoji } from "@plugins/kaomojiPicker/store";

import builtin from "./builtin.json";

export type Kaomoji = {
    id: string;
    value: string;
    tags: string[];
};

export function parseCategory(obj: Record<string, any>): Kaomoji[] {
    const results: Kaomoji[] = [];

    for (const [cat, items] of Object.entries(obj)) {
        if (!Array.isArray(items)) continue;
        items.forEach((item, idx) => {
            const categoryId = idx !== 0 ? `${cat}-${idx}` : cat;
            if (typeof item === "string") {
                results.push({ id: categoryId, value: item, tags: [cat] });
            } else if (item && typeof item === "object") {
                const vals = (Array.isArray(item) ? item : Object.values(item))
                    .filter((v): v is string => typeof v === "string" && Boolean(v));
                if (vals.length >= 2) {
                    results.push({ id: vals[0], value: vals[1], tags: [cat] });
                } else if (vals.length === 1) {
                    results.push({ id: categoryId, value: vals[0], tags: [cat] });
                }
            }
        });
    }
    return results;
}

export function parseUserSetting(raw: string | undefined): Kaomoji[] {
    const trim = raw?.trim();
    if (!trim) return [];

    if (trim.startsWith("{") || trim.startsWith("[")) {
        try {
            const parsed = JSON.parse(trim);
            return parseCategory(Array.isArray(parsed) ? { custom: parsed } : parsed);
        } catch {
            try {
                const sanitized = trim.replace(/,\s*([}\]])/g, "$1");
                const parsed = JSON.parse(sanitized);
                return parseCategory(Array.isArray(parsed) ? { custom: parsed } : parsed);
            } catch { }
        }
    }

    const items = trim.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    return parseCategory({ custom: items });
}

export const BUILTIN_KAOMOJI: Kaomoji[] = parseCategory(builtin);

export function getAllKaomoji(): Kaomoji[] {
    return [...userKaomoji, ...BUILTIN_KAOMOJI];
}

export function getCategories(): string[] {
    return Array.from(new Set([
        ...userKaomoji.flatMap(k => k.tags),
        ...BUILTIN_KAOMOJI.flatMap(k => k.tags)
    ]));
}
