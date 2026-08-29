/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";
import { React } from "@webpack/common";

import { settings } from ".";
import { BUILTIN_CATEGORIES, Kaomoji } from "./data/kaomoji";

const FAVORITES = "KaomojiPicker_Favorites";
const RECENT = "KaomojiPicker_Recent";
const CUSTOM = "KaomojiPicker_Custom";
const CUSTOM_CATS = "KaomojiPicker_CustomCats";
const FOLDED = "KaomojiPicker_FoldedSections";

export let favorites: string[] = [];
export let recent: string[] = [];
export let customEntries: Kaomoji[] = [];
export let customCategories: string[] = [];
export let foldedSections: string[] = [];

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
        customEntries,
        customCategories
    };
}

export async function loadUserData() {
    favorites = (await get<string[]>(FAVORITES)) ?? [];
    recent = (await get<string[]>(RECENT)) ?? [];
    customEntries = (await get<Kaomoji[]>(CUSTOM)) ?? [];
    customCategories = (await get<string[]>(CUSTOM_CATS)) ?? [];
    foldedSections = (await get<string[]>(FOLDED)) ?? [];
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

function saveCustom() {
    set(CUSTOM, customEntries);
    notify();
}

function saveCustomCategories() {
    set(CUSTOM_CATS, customCategories);
    notify();
}

function saveFolded() {
    set(FOLDED, foldedSections);
    notify();
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

export function addCustomEntry(entry: Kaomoji) {
    customEntries.push(entry);
    saveCustom();
}

export function deleteCustomEntry(id: string) {
    const entry = customEntries.find(e => e.id === id);
    if (!entry) return;

    customEntries = customEntries.filter(e => e.id !== id);
    saveCustom();

    if (favorites.includes(entry.value)) {
        favorites = favorites.filter(v => v !== entry.value);
        saveFavorites();
    }
    if (recent.includes(entry.value)) {
        recent = recent.filter(v => v !== entry.value);
        saveRecent();
    }
}

export function addCategory(name: string) {
    name = name.trim();
    if (!name || customCategories.some(c => c.toLowerCase() === name.toLowerCase()) || (BUILTIN_CATEGORIES as readonly string[]).includes(name.toLowerCase())) return false;
    customCategories.push(name);
    saveCustomCategories();
    return true;
}

export function renameCategory(oldName: string, newName: string) {
    newName = newName.trim();
    if (!newName || oldName.toLowerCase() === newName.toLowerCase() || customCategories.some(c => c.toLowerCase() === newName.toLowerCase() && c.toLowerCase() !== oldName.toLowerCase()) || (BUILTIN_CATEGORIES as readonly string[]).includes(newName.toLowerCase())) return false;

    customCategories[customCategories.indexOf(oldName)] = newName;
    for (const entry of customEntries) {
        const i = entry.tags.indexOf(oldName);
        if (i !== -1) entry.tags[i] = newName;
    }
    saveCustomCategories();
    saveCustom();
    return true;
}

export function deleteCategory(name: string) {
    customCategories = customCategories.filter(c => c !== name);
    for (const entry of customEntries) {
        entry.tags = entry.tags.filter(t => t !== name);
    }
    saveCustomCategories();
    saveCustom();
}
