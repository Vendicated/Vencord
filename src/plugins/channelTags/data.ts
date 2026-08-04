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
    group?: string;
    shape?: TagShape;
}

export const TagShapes = {
    Circle: "circle",
    Triangle: "triangle",
    Square: "square",
    Spark: "spark",
    Star: "star",
} as const;
export type TagShape = (typeof TagShapes)[keyof typeof TagShapes];
export const TagShapesList: TagShape[] = Object.values(TagShapes);

export const DEFAULT_TAG_SHAPE: TagShape = TagShapes.Circle;

export type TagMap = Record<string, ChannelTag>;
export type ChannelTagMap = Record<string, string[]>;

export const sortAlphaNum = (a: string, b: string) => a.localeCompare(b, LocaleStore?.locale ?? "en", { numeric: true });

export function compareTags(a: ChannelTag, b: ChannelTag) {
    if (a.group && b.group) {
        const groupComparison = sortAlphaNum(a.group, b.group);
        if (groupComparison) return groupComparison;
    } else if (a.group) {
        return -1;
    } else if (b.group) {
        return 1;
    }

    return sortAlphaNum(a.name, b.name);
}

function sortTagIds(tagIds: string[]) {
    const tags = getTagMap();
    return tagIds.sort((a, b) => compareTags(
        tags[a] ?? { name: "", color: "" },
        tags[b] ?? { name: "", color: "" }
    ));
}

export function createTag(name: string, color: string, shape: TagShape = DEFAULT_TAG_SHAPE, group?: string): string {
    const id = crypto.randomUUID();
    getTagMap()[id] = { name, color, group, shape };
    return id;
}

export function updateTag(id: string, tag: ChannelTag) {
    const tags = getTagMap();
    if (!tags[id]) return;

    tags[id] = tag;
    const channelTags = getChannelTagMap();
    for (const [channelId, tagIds] of Object.entries(channelTags)) {
        if (!tagIds.includes(id)) continue;

        const nextTagIds = tag.group
            ? tagIds.filter(tagId => tagId === id || tags[tagId]?.group !== tag.group)
            : [...tagIds];
        channelTags[channelId] = sortTagIds(nextTagIds);
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
    const tags = getTagMap();
    const group = tags[tagId]?.group;
    const tagIds = (channelTags[channelId] ?? [])
        .filter(id => !group || tags[id]?.group !== group);
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
