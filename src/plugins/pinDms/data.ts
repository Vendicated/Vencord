/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useForceUpdater } from "@utils/react";
import { UserStore } from "@webpack/common";

import { PinOrder, PrivateChannelSortStore, settings } from "./index";

export interface Category {
    id: string;
    name: string;
    color: number;
    channels: string[];
    collapsed?: boolean;
}

const CATEGORY_BASE_KEY = "PinDMsCategories-";
const CATEGORY_MIGRATED_PINDMS_KEY = "PinDMsMigratedPinDMs";
const CATEGORY_MIGRATED_KEY = "PinDMsMigratedOldCategories";
const OLD_CATEGORY_KEY = "BetterPinDMsCategories-";

let forceUpdateDms: (() => void) | undefined = undefined;
export let currentUserCategories: Category[] = [];

export async function init() {
    const userId = UserStore.getCurrentUser()?.id;
    if (userId == null) return;

    currentUserCategories = settings.store.userBasedCategoryList[userId] ??= [];
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
}

export function addChannelToCategory(channelId: string, categoryId: string) {
    const category = currentUserCategories.find(c => c.id === categoryId);
    if (category == null) return;

    if (category.channels.includes(channelId)) return;

    category.channels.push(channelId);
}

export function removeChannelFromCategory(channelId: string) {
    const category = currentUserCategories.find(c => c.channels.includes(channelId));
    if (category == null) return;

    category.channels = category.channels.filter(c => c !== channelId);
}

export function removeCategory(categoryId: string) {
    const categoryIndex = currentUserCategories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) return;

    currentUserCategories.splice(categoryIndex, 1);
}

export function collapseCategory(id: string, value = true) {
    const category = currentUserCategories.find(c => c.id === id);
    if (category == null) return;

    category.collapsed = value;
}

// Utils
export function isPinned(id: string) {
    return currentUserCategories.some(c => c.channels.includes(id));
}

export function categoryLen() {
    return currentUserCategories.length;
}

export function getAllUncollapsedChannels() {
    if (settings.store.pinOrder === PinOrder.LastMessage) {
        const sortedChannels = PrivateChannelSortStore.getPrivateChannelIds();
        return currentUserCategories.filter(c => !c.collapsed).flatMap(c => sortedChannels.filter(channel => c.channels.includes(channel)));
    }

    return currentUserCategories.filter(c => !c.collapsed).flatMap(c => c.channels);
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
}
