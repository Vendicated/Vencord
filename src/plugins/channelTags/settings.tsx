/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import type { ChannelTagMap, TagMap } from "./data";
import { TagSettings } from "./TagSettings";

export const settings = definePluginSettings({
    clickTagsToRemove: {
        type: OptionType.BOOLEAN,
        displayName: "Click tags to remove them",
        description: "Whether clicking a tag decoration removes it from its channel",
        default: true
    },
    manageTags: {
        type: OptionType.COMPONENT,
        component: TagSettings
    }
}).withPrivateSettings<{
    tags?: TagMap;
    channelTags?: ChannelTagMap;
}>();

export function getTagMap() {
    return settings.store.tags ??= {};
}

export function getChannelTagMap() {
    return settings.store.channelTags ??= {};
}
