/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LocaleStore } from "@webpack/common";

import { settings } from "./settings";

export interface ChannelTag {
    name: string;
    color: string;
    shape?: TagShape;
}

export type TagShape = "square" | "triangle" | "circle";

export const DEFAULT_TAG_SHAPE: TagShape = "square";

export type TagMap = Record<string, ChannelTag>;
export type ChannelTagMap = Record<string, string[]>;

export const sortAlphaNum = (a: string, b: string) => a.localeCompare(b, LocaleStore?.locale ?? "en", { numeric: true });

function sortTagIds(tagIds: string[]) {
    return tagIds.sort((a, b) => sortAlphaNum(settings.store.tags[a]?.name ?? "", settings.store.tags[b]?.name ?? ""));
}

export function createTag(name: string, color: string, shape: TagShape = DEFAULT_TAG_SHAPE): string {
    const id = crypto.randomUUID();
    settings.store.tags[id] = { name, color, shape };
    return id;
}

export function updateTag(id: string, tag: ChannelTag) {
    if (!settings.store.tags[id]) return;

    settings.store.tags[id] = tag;
    for (const [channelId, tagIds] of Object.entries(settings.store.channelTags)) {
        if (tagIds.includes(id)) settings.store.channelTags[channelId] = sortTagIds([...tagIds]);
    }
}

export function deleteTag(id: string) {
    delete settings.store.tags[id];

    for (const [channelId, tagIds] of Object.entries(settings.store.channelTags)) {
        const nextTagIds = tagIds.filter(tagId => tagId !== id);
        if (nextTagIds.length) settings.store.channelTags[channelId] = nextTagIds;
        else delete settings.store.channelTags[channelId];
    }
}

export function addTagToChannel(channelId: string, tagId: string) {
    const tagIds = settings.store.channelTags[channelId] ?? [];
    if (!tagIds.includes(tagId)) settings.store.channelTags[channelId] = sortTagIds([...tagIds, tagId]);
}

export function removeTagFromChannel(channelId: string, tagId: string) {
    const tagIds = settings.store.channelTags[channelId];
    if (!tagIds) return;

    const nextTagIds = tagIds.filter(id => id !== tagId);
    if (nextTagIds.length) settings.store.channelTags[channelId] = nextTagIds;
    else delete settings.store.channelTags[channelId];
}
