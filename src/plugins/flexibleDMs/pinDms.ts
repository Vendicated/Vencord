/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { settings } from "@plugins/pinDms";
import { categoryLen } from "@plugins/pinDms/data";
import { UserStore } from "@webpack/common";

export function getPinnedIds(): Set<string> {
    const userId = UserStore.getCurrentUser()?.id;
    if (!isPluginEnabled("PinDMs") || !userId) return new Set();
    return new Set(settings.store.userBasedCategoryList[userId]?.flatMap(category => category.channels));
}

export const isPinned = (id: string) => getPinnedIds().has(id);
export const getDMSection = () => 1 + (isPluginEnabled("PinDMs") ? categoryLen() : 0);
export const isDMSectionCollapsed = () => isPluginEnabled("PinDMs") && settings.store.canCollapseDmSection && settings.store.dmSectionCollapsed;

export function getPinDmsVersion() {
    if (!isPluginEnabled("PinDMs")) return "";
    const { userBasedCategoryList, pinOrder, canCollapseDmSection, dmSectionCollapsed } = settings.store;
    return JSON.stringify([userBasedCategoryList[UserStore.getCurrentUser()?.id ?? ""], pinOrder, canCollapseDmSection, dmSectionCollapsed]);
}
