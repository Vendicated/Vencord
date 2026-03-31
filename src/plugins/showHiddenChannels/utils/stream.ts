/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { ApplicationStreamingStore, StreamLike, VoiceStateStore } from "@plugins/showHiddenChannels/core/stores";
import { ActivityFlags, ActivityType } from "@vencord/discord-types/enums";
import { ApplicationStore, PresenceStore } from "@webpack/common";

import { getChannelIdForStreamLookup, isHiddenChannel, StreamLookupChannel } from "./channel";

type VoiceUser = { id?: string | null; } | null | undefined;

export function mergeStreamArrays(original: unknown[] = [], extra: unknown[] = []) {
    const seen = new Set<string>();

    return [...original, ...extra].filter(stream => {
        if (stream == null || typeof stream !== "object") return false;

        const key = `${(stream as StreamLike).ownerId ?? ""}:${(stream as StreamLike).channelId ?? ""}`;
        if (seen.has(key)) return false;

        seen.add(key);
        return true;
    });
}

export function getRawActiveStreamsForChannel(channelId: string | bigint) {
    const resolvedChannelId = String(channelId);

    return mergeStreamArrays(
        ApplicationStreamingStore.getAllActiveStreams?.()
            ?.filter(stream => (stream as StreamLike)?.channelId === resolvedChannelId) ?? [],
        (ApplicationStreamingStore.getState?.().activeStreams ?? [])
            .map(([, stream]) => stream)
            .filter(stream => stream?.channelId === resolvedChannelId)
    );
}

export function getRawApplicationStreamsForChannel(channelId: string | bigint) {
    const resolvedChannelId = String(channelId);

    return mergeStreamArrays(
        ApplicationStreamingStore.getAllApplicationStreams?.()
            ?.filter(stream => (stream as StreamLike)?.channelId === resolvedChannelId) ?? [],
        Object.values(ApplicationStreamingStore.getState?.().streamsByUserAndGuild ?? {})
            .flatMap(streamsByGuild => Object.values(streamsByGuild))
            .filter(stream => stream?.channelId === resolvedChannelId)
    );
}

export function getRawVoiceStatesForChannel(channelId: string | bigint) {
    const resolvedChannelId = String(channelId);

    return Object.values(VoiceStateStore.getAllVoiceStates?.() ?? {})
        .filter(state => state.channelId === resolvedChannelId);
}

export function getStreamingUserIdsForChannel(channel: StreamLookupChannel | string | bigint | null) {
    const channelId = typeof channel === "string" || typeof channel === "bigint"
        ? String(channel)
        : getChannelIdForStreamLookup(channel);

    if (channelId == null) return new Set<string>();

    const userIds = new Set<string>();

    for (const stream of getRawApplicationStreamsForChannel(channelId)) {
        const { ownerId } = (stream as StreamLike);
        if (ownerId) userIds.add(ownerId);
    }

    for (const stream of getRawActiveStreamsForChannel(channelId)) {
        const { ownerId } = (stream as StreamLike);
        if (ownerId) userIds.add(ownerId);
    }

    for (const state of getRawVoiceStatesForChannel(channelId)) {
        if (state.selfStream && state.userId) {
            userIds.add(state.userId);
        }
    }

    return userIds;
}

export function getRawStreamForUser(userId: string | null, guildId?: string | null) {
    if (!userId) return null;

    const matchesGuild = (stream: unknown) => {
        if (stream == null || typeof stream !== "object") return false;
        if (!guildId) return true;

        const streamGuildId = (stream as StreamLike).guildId ?? null;
        return streamGuildId == null || String(streamGuildId) === String(guildId);
    };

    const streamsByGuild = ApplicationStreamingStore.getState?.().streamsByUserAndGuild?.[userId] ?? {};
    const applicationStream = Object.values(streamsByGuild).find(matchesGuild) ?? null;
    if (applicationStream) return applicationStream;

    const activeStream = (ApplicationStreamingStore.getState?.().activeStreams ?? [])
        .map(([, stream]) => stream)
        .find(stream => stream?.ownerId === userId && matchesGuild(stream));
    if (activeStream) return activeStream;

    return ApplicationStreamingStore.getAllApplicationStreams?.()
        ?.find(stream => (stream as StreamLike)?.ownerId === userId && matchesGuild(stream))
        ?? ApplicationStreamingStore.getAllActiveStreams?.()
            ?.find(stream => (stream as StreamLike)?.ownerId === userId && matchesGuild(stream))
        ?? null;
}

function getActivitiesForUser(userId: string | null, guildId?: string | null) {
    if (!userId) return [];
    return PresenceStore.getActivities?.(userId, guildId ?? undefined) ?? [];
}

function getActivityApplicationForUser(userId: string | null, guildId?: string | null) {
    for (const activity of getActivitiesForUser(userId, guildId)) {
        if (activity == null || typeof activity !== "object") continue;
        if (!activity.application_id) continue;
        if (activity.type === ActivityType.CUSTOM_STATUS || activity.type === ActivityType.HANG_STATUS || activity.type === ActivityType.STREAMING) {
            continue;
        }

        if ((activity.flags ?? 0) & ActivityFlags.EMBEDDED) continue;

        return ApplicationStore.getApplication(activity.application_id)
            ?? ApplicationStore.getApplicationByName?.(activity.name)
            ?? null;
    }

    return null;
}

function getHangStatusActivityForUser(userId: string | null, guildId?: string | null) {
    return getActivitiesForUser(userId, guildId)
        .find(activity => activity?.type === ActivityType.HANG_STATUS)
        ?? null;
}

export function getHiddenStreamChannelIdForUser(userId: string | null, guildId?: string | null) {
    const stream = getRawStreamForUser(userId, guildId) as StreamLike | null;
    const channelId = stream?.channelId == null ? null : String(stream.channelId);

    return channelId != null && isHiddenChannel({ channelId }) ? channelId : null;
}

export function shouldForceVoiceUserStreaming(user: VoiceUser, guildId?: string | null) {
    return getHiddenStreamChannelIdForUser(user?.id ?? null, guildId) != null;
}

export function getVoiceUserActivityApplication(user: VoiceUser, guildId?: string | null) {
    return getActivityApplicationForUser(user?.id ?? null, guildId);
}

export function getVoiceUserHangStatusActivity(user: VoiceUser, guildId?: string | null) {
    return getHangStatusActivityForUser(user?.id ?? null, guildId);
}

export function shouldShowVoiceUserHangStatus(user: VoiceUser, guildId?: string | null) {
    return getVoiceUserHangStatusActivity(user, guildId) != null;
}
