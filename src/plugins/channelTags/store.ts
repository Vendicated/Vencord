/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createDefaultGroup, DEFAULT_GROUP, Group } from "./groups";
import { populateMetadata, updateChannelMetadata } from "./metadata";
import { keysOf, presentEntries, presentValues } from "./object";
import { settings } from "./settings";
import { ChannelId } from "./types";

function normalizeGroup(group: Group | undefined) {
    const defaults = createDefaultGroup();
    if (!group || typeof group !== "object") return defaults;
    return {
        isExclusive: typeof group.isExclusive === "boolean" ? group.isExclusive : defaults.isExclusive,
        showInSubmenu: typeof group.showInSubmenu === "boolean" ? group.showInSubmenu : defaults.showInSubmenu,
        hiddenFor: Object.fromEntries(keysOf(DEFAULT_GROUP.hiddenFor).map(target => [
            target,
            typeof group.hiddenFor?.[target] === "boolean" ? group.hiddenFor[target] : defaults.hiddenFor[target]
        ])) as Group["hiddenFor"]
    };
}

export function initializeChannelTagsStore() {
    settings.store.tags ??= {};
    settings.store.channelTags ??= {};
    settings.store.userDMChannels ??= {};
    settings.store.channels ??= {};
    settings.store.guilds ??= {};

    const groups = Object.create(null) as typeof settings.store.groups;
    for (const [name, group] of presentEntries(settings.store.groups ?? {})) {
        Object.defineProperty(groups, name, { configurable: true, enumerable: true, writable: true, value: normalizeGroup(group) });
    }
    for (const tag of presentValues(settings.store.tags)) {
        if (tag.group && !Object.hasOwn(groups, tag.group)) {
            Object.defineProperty(groups, tag.group, { configurable: true, enumerable: true, writable: true, value: createDefaultGroup() });
        }
    }
    settings.store.groups = groups;
}

export const getTagMap = () => settings.store.tags;
export const getGroupMap = () => settings.store.groups;
export const getChannelTagMap = () => settings.store.channelTags;
export const getUserDMChannelMap = () => settings.store.userDMChannels;
export const getChannelsGuildsMaps = () => ({ channels: settings.store.channels, guilds: settings.store.guilds });

export function updateStoreMetadata() {
    const { channels, guilds } = getChannelsGuildsMaps();
    populateMetadata(getChannelTagMap(), channels, guilds);
}

export function updateStoreMetadataForChannel(channelId: ChannelId) {
    const { channels, guilds } = getChannelsGuildsMaps();
    updateChannelMetadata(channelId, getChannelTagMap(), channels, guilds);
}
