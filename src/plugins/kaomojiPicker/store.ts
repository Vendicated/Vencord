/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";
import { React } from "@webpack/common";

import { settings } from ".";
import { Kaomoji } from "./data/kaomoji";

const FAVORITES = "KaomojiPicker_Favorites";
const RECENT = "KaomojiPicker_Recent";
const FOLDED = "KaomojiPicker_FoldedSections";
const KAOMOJI = "KaomojiPicker_UserKaomoji";

export let favorites: string[] = [];
export let recent: string[] = [];
export let foldedSections: string[] = [];
export let userKaomoji: Kaomoji[] = [];

const listeners = new Set<() => void>();

export function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

let storeVersion = 0;
export function notify() {
    storeVersion++;
    for (const listener of listeners) {
        listener();
    }
}

export function useKaomojiStore() {
    const version = React.useSyncExternalStore(subscribe, () => storeVersion);
    return {
        version,
        favorites,
        recent,
        userKaomoji
    };
}

export async function loadUserData() {
    favorites = (await get<string[]>(FAVORITES)) ?? [];
    recent = (await get<string[]>(RECENT)) ?? [];
    foldedSections = (await get<string[]>(FOLDED)) ?? [];
    userKaomoji = (await get<Kaomoji[]>(KAOMOJI)) ?? [];
    notify();
}

function saveFavorites() {
    set(FAVORITES, favorites);
    notify();
}

function saveRecent() {
    set(RECENT, recent);
    notify();
}

function saveFolded() {
    set(FOLDED, foldedSections);
    notify();
}

export async function saveUserKaomoji(kaomoji: Kaomoji[]) {
    userKaomoji = kaomoji;
    await set(KAOMOJI, userKaomoji);
    notify();
}

export function getExportString() {
    const cats: Record<string, any> = {};

    for (const item of userKaomoji) {
        const cat = item.tags[0] || "custom";
        cats[cat] ??= [];
        cats[cat].push({
            id: item.id,
            value: item.value
        });
    }

    return JSON.stringify(cats);
}

export function isFavorite(value: string) {
    return favorites.includes(value);
}

export function toggleFavorite(value: string) {
    const i = favorites.indexOf(value);
    if (i === -1) favorites.push(value);
    else favorites.splice(i, 1);
    saveFavorites();
}

export function addRecent(value: string) {
    recent = [value, ...recent.filter(v => v !== value)]
        .slice(0, Math.max(1, settings.store.recentCap));
    saveRecent();
}

export function removeRecent(value: string) {
    recent = recent.filter(v => v !== value);
    saveRecent();
}

export function isFolded(sectionTitle: string) {
    return foldedSections.includes(sectionTitle);
}

export function toggleFolded(sectionTitle: string) {
    const i = foldedSections.indexOf(sectionTitle);
    if (i === -1) foldedSections.push(sectionTitle);
    else foldedSections.splice(i, 1);
    saveFolded();
}

export function addUserKaomoji(value: string, id?: string, category = "custom") {
    const kaomoji: Kaomoji = {
        id: id || category,
        value: value.trim(),
        tags: [category]
    };
    saveUserKaomoji([...userKaomoji, kaomoji]);
}

export function deleteUserKaomoji(value: string) {
    userKaomoji = userKaomoji.filter(k => k.value !== value && k.id !== value);
    favorites = favorites.filter(v => v !== value && v.trim() !== value.trim());
    recent = recent.filter(v => v !== value && v.trim() !== value.trim());

    saveFavorites();
    saveRecent();
    saveUserKaomoji([...userKaomoji]);
}
