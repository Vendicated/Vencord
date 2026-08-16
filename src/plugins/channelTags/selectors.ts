/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelStore, LocaleStore } from "@webpack/common";

import { GroupMap, GroupName, HiddenFor } from "./groups";
import { TagsChannelMap } from "./metadata";
import { ChannelId, ChannelTag, ChannelTagMap, TagId, TagMap } from "./types";

export interface ChannelTagsData {
    channelTags: ChannelTagMap;
    tags: TagMap;
    groups: GroupMap;
    channels: TagsChannelMap;
}

export const sortAlphaNum = (a: string, b: string) => a.localeCompare(b, LocaleStore?.locale ?? "en", { numeric: true });

export function compareGroups(a: GroupName | undefined, b: GroupName | undefined, groups: GroupMap) {
    const submenuComparison = Number(!!(b && groups[b]?.showInSubmenu)) - Number(!!(a && groups[a]?.showInSubmenu));
    if (submenuComparison) return submenuComparison;
    if (a && b) return sortAlphaNum(a, b);
    return a ? -1 : b ? 1 : 0;
}

export function compareTags(a: ChannelTag, b: ChannelTag) {
    if (a.group && b.group) {
        const groupComparison = sortAlphaNum(a.group, b.group);
        if (groupComparison) return groupComparison;
    } else if (a.group) return -1;
    else if (b.group) return 1;
    return sortAlphaNum(a.name, b.name);
}

export function getChannelHiddenFor(channelId: ChannelId, storedChannels: TagsChannelMap) {
    const channel = ChannelStore.getChannel(channelId);
    if (channel?.isDM()) return HiddenFor.DM;
    if (channel?.isGroupDM()) return HiddenFor.GroupDM;
    if (channel?.isThread()) return HiddenFor.Thread;
    if (channel) return HiddenFor.Channel;
    const stored = storedChannels[channelId];
    if (stored?.kind === "dm") return HiddenFor.DM;
    if (stored?.kind === "groupDm") return HiddenFor.GroupDM;
    if (stored?.kind === "guild") return stored.thread ? HiddenFor.Thread : HiddenFor.Channel;
}

export function isGroupHidden(groupName: ChannelTag["group"], groups: GroupMap, hiddenFor: HiddenFor | undefined) {
    return !!(groupName && hiddenFor && groups[groupName]?.hiddenFor[hiddenFor]);
}

export function selectVisibleChannelTags(channelId: ChannelId, data: ChannelTagsData, hiddenFor: HiddenFor | undefined) {
    return (data.channelTags[channelId] ?? [])
        .map(id => [id, data.tags[id]] as const)
        .filter((entry): entry is readonly [TagId, ChannelTag] => entry[1] != null)
        .filter(([, tag]) => !isGroupHidden(tag.group, data.groups, hiddenFor))
        .sort(([, a], [, b]) => compareTags(a, b));
}
