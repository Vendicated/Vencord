/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { settings } from "@plugins/pinDms";
import { UserStore } from "@webpack/common";

function getCategories() {
    const userId = UserStore.getCurrentUser()?.id;
    if (!isPluginEnabled("PinDMs") || !userId) return [];
    return settings.store.userBasedCategoryList[userId] ?? [];
}

export const getPinnedIds = (): Set<string> => new Set(getCategories().flatMap(category => category.channels));

export const isPinned = (id: string) => getPinnedIds().has(id);
export const getDMSection = () => 1 + getCategories().length;
export const isDMSectionCollapsed = () => isPluginEnabled("PinDMs") && settings.store.canCollapseDmSection && settings.store.dmSectionCollapsed;

export function getPinDmsState() {
    if (!isPluginEnabled("PinDMs")) return "";
    const { userBasedCategoryList, pinOrder, canCollapseDmSection, dmSectionCollapsed } = settings.store;
    return [userBasedCategoryList[UserStore.getCurrentUser()?.id ?? ""], pinOrder, canCollapseDmSection, dmSectionCollapsed];
}
