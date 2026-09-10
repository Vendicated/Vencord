/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RawChannel } from "@vencord/discord-types";
import { ChannelStore, Constants, RestAPI, UserStore } from "@webpack/common";

import { presentEntries } from "./object";
import { getUserDMChannelMap } from "./store";
import { ChannelId, UserId } from "./types";

function lookupUserIdForDMChannel(channelId: ChannelId) {
    return presentEntries(getUserDMChannelMap()).find(([, value]) => value === channelId)?.[0];
}

const inFlightUserDMPosts: Map<UserId, Promise<RawChannel> | "blocked"> = new Map();

function createDMChannelForUser(userId: UserId, returnInFlight = false): Promise<RawChannel> {
    if (inFlightUserDMPosts[userId] === "blocked") return Promise.reject();
    if (inFlightUserDMPosts[userId]) return returnInFlight ? inFlightUserDMPosts[userId] : Promise.reject();

    return inFlightUserDMPosts[userId] = RestAPI.post({
        url: Constants.Endpoints.USER_CHANNELS,
        body: { recipients: [userId] }
    }).then(({ body }: { body: RawChannel; }) => {
        delete inFlightUserDMPosts[userId];
        return body;
    }).catch(() => {
        inFlightUserDMPosts[userId] = "blocked";
        return Promise.reject();
    });
}

export async function ensureDMChannelExists(channelId: ChannelId) {
    const userId = lookupUserIdForDMChannel(channelId);
    if (!userId) return false;
    if (ChannelStore.getChannel(channelId)) return true;
    return !!await createDMChannelForUser(userId, true).catch(() => false);
}

export function getChannelIdForDMsWithUser(userId: UserId) {
    const channels = getUserDMChannelMap();
    const cached = ChannelStore.getDMChannelFromUserId(userId);
    if (cached && channels[userId] !== cached.id) return channels[userId] = cached.id as ChannelId;
    if (channels[userId]) return channels[userId];
    if (UserStore.getCurrentUser().id === userId) return null;

    createDMChannelForUser(userId).then(channel => {
        channels[userId] = channel.id as ChannelId;
        return RestAPI.del({ url: Constants.Endpoints.CHANNEL(channel.id) });
    }).catch();
    return null;
}
