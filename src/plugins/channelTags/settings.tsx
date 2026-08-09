/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { OptionType } from "@utils/types";

import type { ChannelTagMap, TagMap } from "./data";
import {
    populateMetadata,
    type TagsChannelMap,
    type TagsGuildMap
} from "./metadata";
import { openTagsModal } from "./TagsModal";

export const settings = definePluginSettings({
    clickTagsToRemove: {
        type: OptionType.BOOLEAN,
        displayName: "Click tags to remove them",
        description: "Whether clicking a tag decoration removes it from its channel",
        default: true
    },
    manageTags: {
        type: OptionType.COMPONENT,
        component: () => (
            <SettingsSection tag="div" name="Tags" id="" description="" inlineSetting>
                <Button onClick={openTagsModal}>Manage Tags</Button>
            </SettingsSection>
        )
    }
}).withPrivateSettings<{
    tags?: TagMap;
    channelTags?: ChannelTagMap;
    channels?: TagsChannelMap;
    guilds?: TagsGuildMap;
}>();

export const getTagMap = () => settings.store.tags ??= {};

export const getChannelTagMap = () => settings.store.channelTags ??= {};

export const getChannelsGuildsMaps = () => ({
    channels: settings.store.channels ??= {},
    guilds: settings.store.guilds ??= {}
});

export function updateStoreMetadata() {
    populateMetadata(
        settings.store.channelTags ??= {},
        settings.store.channels ??= {},
        settings.store.guilds ??= {}
    );
}
