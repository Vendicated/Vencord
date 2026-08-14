/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelStore, LocaleStore } from "@webpack/common";

import { createDefaultGroup, Group, GroupName, HiddenFor } from "./groups";
import { getChannelsGuildsMaps, getChannelTagMap, getGroupMap, getTagMap, updateStoreMetadata } from "./settings";

export { Group, GroupMap, GroupName, toGroupName } from "./groups";

type EntriesOf<T> = {
    [K in keyof T]-?: [K, T[K]];
}[keyof T][];
export const entriesOf = Object.entries as <T>(obj: T) => EntriesOf<T>;

type KeysOf<T> = (keyof T)[];
export const keysOf = Object.keys as <T extends object>(obj: T) => KeysOf<T>;

type ValuesOf<T> = T[keyof T][];
export const valuesOf = Object.values as <T extends object>(obj: T) => ValuesOf<T>;


export type TagId = string & { _brand: "tagId"; };
export type ChannelId = string & { _brand: "channelId"; };
export type GuildId = string & { _brand: "guildId"; };

export interface ChannelTag {
    name: string;
    color: string;
    group?: GroupName;
    shape?: TagShape;
}

export const TagShapes = {
    Circle: "circle",
    Triangle: "triangle",
    Square: "square",
    Spark: "spark",
    Star: "star",
    Heart: "heart",
    Pin: "pin"
} as const;
export type TagShape = (typeof TagShapes)[keyof typeof TagShapes];
export const TagShapesList: TagShape[] = valuesOf(TagShapes);

export const DEFAULT_TAG_SHAPE: TagShape = TagShapes.Circle;

export type TagMap = { [key: TagId]: ChannelTag; };
export type UserDMChannelMap = { [key: string]: ChannelId; };
export type ChannelTagMap = { [key: ChannelId]: TagId[]; };

export const sortAlphaNum = (a: string, b: string) => a.localeCompare(b, LocaleStore?.locale ?? "en", { numeric: true });

export function compareGroups(a: GroupName | undefined, b: GroupName | undefined) {
    const groups = getGroupMap();
    const submenuComparison = Number(!!groups[b!]?.showInSubmenu) - Number(!!groups[a!]?.showInSubmenu);
    if (submenuComparison) return submenuComparison;
    if (a && b) return sortAlphaNum(a, b);
    return a ? -1 : b ? 1 : 0;
}

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

function sortTagIds(tagIds: TagId[]) {
    const tags = getTagMap();
    return tagIds.sort((a, b) => compareTags(
        tags[a] ?? { name: "", color: "" },
        tags[b] ?? { name: "", color: "" }
    ));
}

export function createTag(name: string, color: string, shape: TagShape = DEFAULT_TAG_SHAPE, group?: GroupName): TagId {
    const id = crypto.randomUUID() as TagId;
    getTagMap()[id] = { name, color, group, shape };
    return id;
}

export function updateTag(id: TagId, tag: ChannelTag) {
    const tags = getTagMap();
    if (!tags[id]) return;

    tags[id] = tag;
    const channelTags = getChannelTagMap();
    for (const [channelId, tagIds] of entriesOf(channelTags)) {
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
    for (const [channelId, tagIds] of entriesOf(channelTags)) {
        const nextTagIds = tagIds.filter(tagId => tagId !== id);
        if (nextTagIds.length) channelTags[channelId] = nextTagIds;
        else delete channelTags[channelId];
    }
    deleteEmptyGroups();
    updateStoreMetadata();
}

export function ensureGroup(name: GroupName) {
    return getGroupMap()[name] ??= createDefaultGroup();
}

export function updateGroup(name: GroupName, group: Group, cleanUpHidden: boolean) {
    getGroupMap()[name] = group;
    if (group.isExclusive) cleanUpExclusiveTags(name);
    if (cleanUpHidden) cleanUpHiddenTags(name, group);
    updateStoreMetadata();
}

export function renameGroup(oldName: GroupName, newName: GroupName) {
    if (oldName === newName) return;

    const groups = getGroupMap();
    const group = groups[oldName] ?? createDefaultGroup();
    groups[newName] ??= group;
    delete groups[oldName];

    for (const tag of valuesOf(getTagMap())) {
        if (tag.group === oldName) tag.group = newName;
    }
}

export function deleteEmptyGroups() {
    const tags = valuesOf(getTagMap());
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
    if (!tagIds.includes(tagId)) channelTags[channelId] = sortTagIds([...tagIds, tagId]);
    updateStoreMetadata();
}

export function getChannelHiddenFor(channelId: ChannelId): HiddenFor | undefined {
    const channel = ChannelStore.getChannel(channelId);
    if (channel?.isDM()) return HiddenFor.DM;
    if (channel?.isGroupDM()) return HiddenFor.GroupDM;
    if (channel?.isThread()) return HiddenFor.Thread;
    if (channel) return HiddenFor.Channel;

    const stored = getChannelsGuildsMaps().channels[channelId];
    if (stored?.kind === "dm") return HiddenFor.DM;
    if (stored?.kind === "groupDm") return HiddenFor.GroupDM;
    if (stored?.kind === "guild") return stored.thread ? HiddenFor.Thread : HiddenFor.Channel;
}

export function isGroupHiddenForChannel(groupName: GroupName | undefined, channelId: ChannelId) {
    if (!groupName) return false;
    const target = getChannelHiddenFor(channelId);
    return target ? getGroupMap()[groupName]?.hiddenFor[target] ?? false : false;
}

export function hasExclusiveConflicts(groupName: GroupName) {
    return valuesOf(getChannelTagMap()).some(tagIds =>
        tagIds.filter(id => getTagMap()[id]?.group === groupName).length > 1
    );
}

export function hasHiddenConflicts(groupName: GroupName, group: Group) {
    return entriesOf(getChannelTagMap()).some(([channelId, tagIds]) => {
        const target = getChannelHiddenFor(channelId);
        return target && group.hiddenFor[target] && tagIds.some(id => getTagMap()[id]?.group === groupName);
    });
}

function cleanUpExclusiveTags(groupName: GroupName) {
    const channelTags = getChannelTagMap();
    for (const [channelId, tagIds] of entriesOf(channelTags)) {
        let found = false;
        channelTags[channelId] = tagIds.filter(id => {
            if (getTagMap()[id]?.group !== groupName) return true;
            if (found) return false;
            return found = true;
        });
    }
}

function cleanUpHiddenTags(groupName: GroupName, group: Group) {
    const channelTags = getChannelTagMap();
    for (const [channelId, tagIds] of entriesOf(channelTags)) {
        const target = getChannelHiddenFor(channelId);
        if (!target || !group.hiddenFor[target]) continue;
        const nextTagIds = tagIds.filter(id => getTagMap()[id]?.group !== groupName);
        if (nextTagIds.length) channelTags[channelId] = nextTagIds;
        else delete channelTags[channelId];
    }
}

export function removeTagFromChannel(channelId: ChannelId, tagId: TagId) {
    const channelTags = getChannelTagMap();
    const tagIds = channelTags[channelId];
    if (!tagIds) return;

    const nextTagIds = tagIds.filter(id => id !== tagId);
    if (nextTagIds.length) channelTags[channelId] = nextTagIds;
    else delete channelTags[channelId];
    updateStoreMetadata();
}
