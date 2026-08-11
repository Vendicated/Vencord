/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { OptionType } from "@utils/types";
import { ChannelStore, Constants, RestAPI } from "@webpack/common";

import type { ChannelTagMap, TagMap, UserDMChannelMap } from "./data";
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
    userDMChannels?: UserDMChannelMap;
    channels?: TagsChannelMap;
    guilds?: TagsGuildMap;
}>();

export const getTagMap = () => settings.store.tags ??= {};

export const getChannelTagMap = () => settings.store.channelTags ??= {};

export const getUserDMChannelMap = () => settings.store.userDMChannels ??= {};

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

const inFlightUserDMPosts: Record<string, Promise<void>> = {};

export function getChannelIdForDMsWithUser(userId: string) {
    const storeUserDMChannel = getUserDMChannelMap();

    const cached = ChannelStore.getDMChannelFromUserId(userId);
    if (cached && storeUserDMChannel[userId] !== cached.id)
        return storeUserDMChannel[userId] = cached.id;

    if (storeUserDMChannel[userId])
        return storeUserDMChannel[userId];

    if (!!inFlightUserDMPosts[userId])
        return null;

    inFlightUserDMPosts[userId] = RestAPI
        .post({
            url: Constants.Endpoints.USER_CHANNELS,
            body: { recipients: [userId] }
        })
        .then(({ body: channel }) => {
            storeUserDMChannel[userId] = channel.id;
        })
        .finally(() => {
            delete inFlightUserDMPosts[userId];
        });

    return null;
}
