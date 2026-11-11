/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PinOrder, PrivateChannelSortStore, settings } from "@plugins/pinDms";
import { useForceUpdater } from "@utils/react";
import { UserStore } from "@webpack/common";

export interface Category {
    id: string;
    name: string;
    color: number;
    channels: string[];
    collapsed?: boolean;
}

let forceUpdateDms: (() => void) | undefined = undefined;
export let currentUserCategories: Category[] = [];

let pinnedSetCache: Set<string> | null = null;
let sortOrderCache: Map<string, number> | null = null;

function invalidatePinnedCache() {
    pinnedSetCache = null;
}

function getPinnedSet(): Set<string> {
    return (pinnedSetCache ??= new Set(currentUserCategories.flatMap(c => c.channels)));
}

function getSortOrder(): Map<string, number> {
    if (sortOrderCache === null) {
        const ids = PrivateChannelSortStore.getPrivateChannelIds();
        const map = new Map<string, number>();
        for (let i = 0; i < ids.length; i++) map.set(ids[i], i);
        sortOrderCache = map;

        queueMicrotask(() => { sortOrderCache = null; });
    }
    return sortOrderCache;
}

export async function init() {
    const userId = UserStore.getCurrentUser()?.id;
    if (userId == null) return;

    currentUserCategories = settings.store.userBasedCategoryList[userId] ??= [];
    invalidatePinnedCache();
    forceUpdateDms?.();
}

export function usePinnedDms() {
    forceUpdateDms = useForceUpdater();
    settings.use(["pinOrder", "canCollapseDmSection", "dmSectionCollapsed", "userBasedCategoryList"]);
}

export function getCategory(id: string) {
    return currentUserCategories.find(c => c.id === id);
}

export function getCategoryByIndex(index: number) {
    return currentUserCategories[index];
}

export function createCategory(category: Category) {
    currentUserCategories.push(category);
    invalidatePinnedCache();
}

export function addChannelToCategory(channelId: string, categoryId: string) {
    const category = currentUserCategories.find(c => c.id === categoryId);
    if (category == null) return;

    if (category.channels.includes(channelId)) return;

    category.channels.push(channelId);
    invalidatePinnedCache();
}

export function removeChannelFromCategory(channelId: string) {
    const category = currentUserCategories.find(c => c.channels.includes(channelId));
    if (category == null) return;

    category.channels = category.channels.filter(c => c !== channelId);
    invalidatePinnedCache();
}

export function removeCategory(categoryId: string) {
    const categoryIndex = currentUserCategories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) return;

    currentUserCategories.splice(categoryIndex, 1);
    invalidatePinnedCache();
}

export function collapseCategory(id: string, value = true) {
    const category = currentUserCategories.find(c => c.id === id);
    if (category == null) return;

    category.collapsed = value;
}

// Utils
export function isPinned(id: string) {
    return getPinnedSet().has(id);
}

export function categoryLen() {
    return currentUserCategories.length;
}

export function getCategoryChannels(category: Category): string[] {
    if (category.channels.length === 0) return [];

    if (settings.store.pinOrder === PinOrder.LastMessage) {
        const order = getSortOrder();
        return category.channels
            .filter(id => order.has(id))
            .sort((a, b) => order.get(a)! - order.get(b)!);
    }

    return category.channels;
}

export function getAllUncollapsedChannels() {
    return currentUserCategories
        .filter(c => !c.collapsed)
        .flatMap(getCategoryChannels);
}

export function getSections() {
    return currentUserCategories.reduce((acc, category) => {
        acc.push(category.channels.length === 0 ? 1 : category.channels.length);
        return acc;
    }, [] as number[]);
}

// Move categories
export const canMoveArrayInDirection = (array: any[], index: number, direction: -1 | 1) => {
    const a = array[index];
    const b = array[index + direction];

    return a && b;
};

export const canMoveCategoryInDirection = (id: string, direction: -1 | 1) => {
    const categoryIndex = currentUserCategories.findIndex(m => m.id === id);
    return canMoveArrayInDirection(currentUserCategories, categoryIndex, direction);
};

export const canMoveCategory = (id: string) => canMoveCategoryInDirection(id, -1) || canMoveCategoryInDirection(id, 1);

export const canMoveChannelInDirection = (channelId: string, direction: -1 | 1) => {
    const category = currentUserCategories.find(c => c.channels.includes(channelId));
    if (category == null) return false;

    const channelIndex = category.channels.indexOf(channelId);
    return canMoveArrayInDirection(category.channels, channelIndex, direction);
};


function swapElementsInArray(array: any[], index1: number, index2: number) {
    if (!array[index1] || !array[index2]) return;
    [array[index1], array[index2]] = [array[index2], array[index1]];
}

export function moveCategory(id: string, direction: -1 | 1) {
    const a = currentUserCategories.findIndex(m => m.id === id);
    const b = a + direction;

    swapElementsInArray(currentUserCategories, a, b);
}

export function moveChannel(channelId: string, direction: -1 | 1) {
    const category = currentUserCategories.find(c => c.channels.includes(channelId));
    if (category == null) return;

    const a = category.channels.indexOf(channelId);
    const b = a + direction;

    swapElementsInArray(category.channels, a, b);
    invalidatePinnedCache();
}
