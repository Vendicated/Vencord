/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LocaleStore } from "@webpack/common";

import { getChannelTagMap, getTagMap } from "./settings";

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
    const tags = getTagMap();
    return tagIds.sort((a, b) => sortAlphaNum(tags[a]?.name ?? "", tags[b]?.name ?? ""));
}

export function createTag(name: string, color: string, shape: TagShape = DEFAULT_TAG_SHAPE): string {
    const id = crypto.randomUUID();
    getTagMap()[id] = { name, color, shape };
    return id;
}

export function updateTag(id: string, tag: ChannelTag) {
    const tags = getTagMap();
    if (!tags[id]) return;

    tags[id] = tag;
    const channelTags = getChannelTagMap();
    for (const [channelId, tagIds] of Object.entries(channelTags)) {
        if (tagIds.includes(id)) channelTags[channelId] = sortTagIds([...tagIds]);
    }
}

export function deleteTag(id: string) {
    delete getTagMap()[id];

    const channelTags = getChannelTagMap();
    for (const [channelId, tagIds] of Object.entries(channelTags)) {
        const nextTagIds = tagIds.filter(tagId => tagId !== id);
        if (nextTagIds.length) channelTags[channelId] = nextTagIds;
        else delete channelTags[channelId];
    }
}

export function addTagToChannel(channelId: string, tagId: string) {
    const channelTags = getChannelTagMap();
    const tagIds = channelTags[channelId] ?? [];
    if (!tagIds.includes(tagId)) channelTags[channelId] = sortTagIds([...tagIds, tagId]);
}

export function removeTagFromChannel(channelId: string, tagId: string) {
    const channelTags = getChannelTagMap();
    const tagIds = channelTags[channelId];
    if (!tagIds) return;

    const nextTagIds = tagIds.filter(id => id !== tagId);
    if (nextTagIds.length) channelTags[channelId] = nextTagIds;
    else delete channelTags[channelId];
}
