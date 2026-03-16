/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const TAG_CORE = "Core";
export const TAG_NAVIGATION = "Navigation";
export const TAG_UTILITY = "Utility";
export const TAG_DEVELOPER = "Developer";
export const TAG_CUSTOMIZATION = "Customization";
export const TAG_PLUGINS = "Plugins";
export const TAG_SESSION = "Session";
export const TAG_CONTEXT = "Context";
export const TAG_CUSTOM = "Custom";
export const TAG_GUILDS = "Guilds";
export const TAG_FRIENDS = "Friends";

export function normalizeTag(tag: string): string {
    return tag.trim().toLowerCase();
}
