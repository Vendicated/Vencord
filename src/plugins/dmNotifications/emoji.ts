/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EmojiStore, GuildStore } from "@webpack/common";

export interface EmojiSuggestion {
    key: string;
    name: string;
    src?: string;
    unicode?: string;
}

export interface EmojiCategory {
    label: string;
    icon?: string;
    emojis: EmojiSuggestion[];
}

const COMMON_UNICODE: Record<string, string> = {
    smile: "😄", joy: "😂", laughing: "😆", wink: "😉", blush: "😊",
    heart: "❤️", heart_eyes: "😍", thumbsup: "👍", thumbsdown: "👎",
    fire: "🔥", tada: "🎉", clap: "👏", eyes: "👀", cry: "😢",
    sob: "😭", angry: "😡", thinking: "🤔", pray: "🙏", ok_hand: "👌",
    100: "💯", skull: "💀", sunglasses: "😎", wave: "👋", rofl: "🤣",
    heart_eyes_cat: "😻", scream: "😱", partying_face: "🥳", sparkles: "✨"
};

const RECENT_KEY = "vc-dmn-recent-emoji";
const RECENT_LIMIT = 16;

function unicodeEmoji(): EmojiSuggestion[] {
    return Object.entries(COMMON_UNICODE).map(([name, unicode]) => ({ key: `u:${name}`, name, unicode }));
}

function guildEmoji(): EmojiCategory[] {
    const categories: EmojiCategory[] = [];
    try {
        const guilds = Object.values(GuildStore.getGuilds()) as any[];
        for (const guild of guilds) {
            const emojis: any[] = EmojiStore.getGuildEmoji(guild.id) ?? [];
            if (!emojis.length) continue;
            categories.push({
                label: guild.name,
                icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=32` : undefined,
                emojis: emojis.filter(e => e?.name && e?.id).map(e => ({
                    key: `c:${e.id}`,
                    name: e.name,
                    src: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "webp"}?size=32&quality=lossless`
                }))
            });
        }
    } catch {
        // best effort only
    }
    return categories;
}

export function getRecentEmoji(): EmojiSuggestion[] {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function recordRecentEmoji(emoji: EmojiSuggestion) {
    try {
        const recent = getRecentEmoji().filter(e => e.key !== emoji.key);
        recent.unshift(emoji);
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, RECENT_LIMIT)));
    } catch {
        // ignore storage errors
    }
}

/** Flat list used for the ":shortcode" inline autocomplete while typing. */
export function searchEmoji(query: string, limit = 8): EmojiSuggestion[] {
    const q = query.toLowerCase();
    if (!q) return [];

    const results: EmojiSuggestion[] = [];
    for (const e of unicodeEmoji()) {
        if (e.name.startsWith(q)) results.push(e);
        if (results.length >= limit) return results;
    }
    for (const category of guildEmoji()) {
        for (const e of category.emojis) {
            if (!e.name.toLowerCase().startsWith(q)) continue;
            results.push(e);
            if (results.length >= limit) return results;
        }
    }
    return results;
}

/** Categorized list used by the picker popover: Frequently Used, Smileys, then one section per server. */
export function getEmojiCategories(query: string): EmojiCategory[] {
    const q = query.trim().toLowerCase();

    if (q) {
        const emojis: EmojiSuggestion[] = [];
        for (const e of unicodeEmoji()) if (e.name.includes(q)) emojis.push(e);
        for (const category of guildEmoji()) for (const e of category.emojis) if (e.name.toLowerCase().includes(q)) emojis.push(e);
        return emojis.length ? [{ label: "Search Results", emojis }] : [];
    }

    const categories: EmojiCategory[] = [];
    const recent = getRecentEmoji();
    if (recent.length) categories.push({ label: "Frequently Used", emojis: recent });
    categories.push({ label: "Smileys & People", emojis: unicodeEmoji() });
    categories.push(...guildEmoji());
    return categories;
}

export function emojiToText(e: EmojiSuggestion): string {
    if (e.unicode) return e.unicode;
    const id = e.key.slice(2);
    return `<:${e.name}:${id}>`;
}
