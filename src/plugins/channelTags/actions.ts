/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createDefaultGroup, Group, GroupName } from "./groups";
import { keysOf, presentEntries, presentValues } from "./object";
import { compareTags, getChannelHiddenFor } from "./selectors";
import { getChannelsGuildsMaps, getChannelTagMap, getGroupMap, getTagMap, updateStoreMetadata, updateStoreMetadataForChannel } from "./store";
import { ChannelId, ChannelTag, DEFAULT_TAG_SHAPE, TagId, TagShape } from "./types";

function sortTagIds(tagIds: TagId[]) {
    const tags = getTagMap();
    return tagIds.sort((a, b) => compareTags(
        tags[a] ?? { name: "", color: "" },
        tags[b] ?? { name: "", color: "" }
    ));
}

export function createTag(name: string, color: string, shape: TagShape = DEFAULT_TAG_SHAPE, group?: GroupName) {
    const id = crypto.randomUUID() as TagId;
    getTagMap()[id] = { name, color, group, shape };
    return id;
}

export function updateTag(id: TagId, tag: ChannelTag) {
    const tags = getTagMap();
    if (!tags[id]) return;

    tags[id] = tag;
    const channelTags = getChannelTagMap();
    for (const [channelId, tagIds] of presentEntries(channelTags)) {
        if (!tagIds.includes(id)) continue;

        const nextTagIds = tag.group && getGroupMap()[tag.group]?.isExclusive
            ? tagIds.filter(tagId => tagId === id || tags[tagId]?.group !== tag.group)
            : [...tagIds];
        channelTags[channelId] = sortTagIds(nextTagIds);
    }
    deleteEmptyGroups();
}

export function deleteTag(id: TagId) {
    delete getTagMap()[id];

    const channelTags = getChannelTagMap();
    for (const [channelId, tagIds] of presentEntries(channelTags)) {
        const nextTagIds = tagIds.filter(tagId => tagId !== id);
        if (nextTagIds.length) channelTags[channelId] = nextTagIds;
        else delete channelTags[channelId];
    }
    deleteEmptyGroups();
    updateStoreMetadata();
}

export function ensureGroup(name: GroupName) {
    const groups = getGroupMap();
    if (Object.hasOwn(groups, name)) return groups[name]!;

    const group = createDefaultGroup();
    groups[name] = group;
    return group;
}

export function saveGroup(oldName: GroupName, newName: GroupName, group: Group, cleanUpHidden: boolean) {
    const groups = getGroupMap();
    if (oldName !== newName && Object.hasOwn(groups, newName)) return false;

    const wasExclusive = groups[oldName]?.isExclusive ?? createDefaultGroup().isExclusive;
    const storedGroup = { ...group, hiddenFor: { ...group.hiddenFor } };
    groups[newName] = storedGroup;

    if (oldName !== newName) {
        delete groups[oldName];
        for (const tag of presentValues(getTagMap())) {
            if (tag.group === oldName) tag.group = newName;
        }
    }

    if (!wasExclusive && storedGroup.isExclusive) cleanUpExclusiveTags(newName);
    if (cleanUpHidden) cleanUpHiddenTags(newName, storedGroup);
    updateStoreMetadata();
    return true;
}

export function deleteEmptyGroups() {
    const tags = presentValues(getTagMap());
    const groups = getGroupMap();
    for (const name of keysOf(groups)) {
        if (!tags.some(tag => tag.group === name)) delete groups[name];
    }
}

export function addTagToChannel(channelId: ChannelId, tagId: TagId) {
    const channelTags = getChannelTagMap();
    const tags = getTagMap();
    const group = tags[tagId]?.group;
    const isExclusive = group && getGroupMap()[group]?.isExclusive;
    const tagIds = (channelTags[channelId] ?? [])
        .filter(id => !isExclusive || tags[id]?.group !== group);
    if (tagIds.includes(tagId)) return;

    channelTags[channelId] = sortTagIds([...tagIds, tagId]);
    updateStoreMetadataForChannel(channelId);
}

export function hasExclusiveConflicts(groupName: GroupName) {
    const tags = getTagMap();
    return presentValues(getChannelTagMap()).some(tagIds =>
        tagIds.filter(id => tags[id]?.group === groupName).length > 1
    );
}

export function hasHiddenConflicts(groupName: GroupName, group: Group) {
    const tags = getTagMap();
    const { channels } = getChannelsGuildsMaps();
    return presentEntries(getChannelTagMap()).some(([channelId, tagIds]) => {
        const target = getChannelHiddenFor(channelId, channels);
        return target && group.hiddenFor[target] && tagIds.some(id => tags[id]?.group === groupName);
    });
}

function cleanUpExclusiveTags(groupName: GroupName) {
    const channelTags = getChannelTagMap();
    const tags = getTagMap();
    for (const [channelId, tagIds] of presentEntries(channelTags)) {
        let found = false;
        const nextTagIds = tagIds.filter(id => {
            if (tags[id]?.group !== groupName) return true;
            if (found) return false;
            return found = true;
        });
        if (nextTagIds.length !== tagIds.length) channelTags[channelId] = nextTagIds;
    }
}

function cleanUpHiddenTags(groupName: GroupName, group: Group) {
    const channelTags = getChannelTagMap();
    const tags = getTagMap();
    const { channels } = getChannelsGuildsMaps();
    for (const [channelId, tagIds] of presentEntries(channelTags)) {
        const target = getChannelHiddenFor(channelId, channels);
        if (!target || !group.hiddenFor[target]) continue;
        const nextTagIds = tagIds.filter(id => tags[id]?.group !== groupName);
        if (nextTagIds.length === tagIds.length) continue;
        if (nextTagIds.length) channelTags[channelId] = nextTagIds;
        else delete channelTags[channelId];
    }
}

export function removeTagFromChannel(channelId: ChannelId, tagId: TagId) {
    const channelTags = getChannelTagMap();
    const tagIds = channelTags[channelId];
    if (!tagIds?.includes(tagId)) return;

    const nextTagIds = tagIds.filter(id => id !== tagId);
    if (nextTagIds.length) channelTags[channelId] = nextTagIds;
    else delete channelTags[channelId];
    updateStoreMetadataForChannel(channelId);
}
