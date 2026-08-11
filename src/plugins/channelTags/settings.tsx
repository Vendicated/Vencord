/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { OptionType } from "@utils/types";
import { RawChannel } from "@vencord/discord-types";
import { ChannelStore, Constants, RestAPI, UserStore } from "@webpack/common";

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

function lookupUserIdForDMChannel(channelId: string) {
    const userDMChannelMap = getUserDMChannelMap();

    return Object.entries(userDMChannelMap).find(
        ([, v]) => v === channelId
    )?.[0];
}

const inFlightUserDMPosts: Map<string, Promise<RawChannel> | "blocked"> = new Map();

/**
 * Creates the DM channel for the specified userId and returns it.
 */
function createDMChannelForUser(userId: string, returnInFlight: boolean = false): Promise<RawChannel> {
    if (inFlightUserDMPosts[userId] === "blocked")
        return Promise.reject();

    if (inFlightUserDMPosts[userId])
        return returnInFlight ? inFlightUserDMPosts[userId] : Promise.reject();

    inFlightUserDMPosts[userId] = RestAPI
        .post({
            url: Constants.Endpoints.USER_CHANNELS,
            body: { recipients: [userId] }
        })
        .then(({ body: channel }: { body: RawChannel; }) => {
            delete inFlightUserDMPosts[userId];
            return channel;
        })
        .catch(() => {
            // Block this user, avoid spamming the API
            inFlightUserDMPosts[userId] = "blocked";
            return Promise.reject();
        });

    return inFlightUserDMPosts[userId];
}

export async function ensureDMChannelExists(channelId: string) {
    const userId = lookupUserIdForDMChannel(channelId);
    if (!userId) return false;

    const channel = ChannelStore.getChannel(channelId);
    if (channel) return true;

    const newChannel = await (createDMChannelForUser(userId, true).catch(() => false));
    return !!newChannel;
}

export function getChannelIdForDMsWithUser(userId: string) {
    const storeUserDMChannel = getUserDMChannelMap();

    const cached = ChannelStore.getDMChannelFromUserId(userId);
    if (cached && storeUserDMChannel[userId] !== cached.id)
        return storeUserDMChannel[userId] = cached.id;

    if (storeUserDMChannel[userId])
        return storeUserDMChannel[userId];

    const selfUser = UserStore.getCurrentUser();
    if (selfUser.id === userId)
        return null;

    /**
     * "Fetch" the DM channel ID from API directly and store it.
     *
     * This "creates" the channel, which then causes it to show in the user's messages list.
     * To avoid complaints about this, we delete the channel immediately.
     * Deleting DM channels doesn't delete anything permanently.
     */

    createDMChannelForUser(userId)
        .then(channel => {
            storeUserDMChannel[userId] = channel.id;

            return RestAPI.del({
                url: Constants.Endpoints.CHANNEL(channel.id)
            });
        })
        .catch(); // Do nothing, just don't not do nothing.

    return null;
}
