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

import { PARTICIPANT_TYPE_STREAM, PARTICIPANT_TYPE_USER } from "@plugins/showHiddenChannels/core/constants";
import { ApplicationStreamingStore, ChannelRTCStore, StreamLike, VoiceStateLike, VoiceStateStore } from "@plugins/showHiddenChannels/core/stores";
import { isHiddenChannel } from "@plugins/showHiddenChannels/utils/channel";
import {
    getHiddenStreamChannelIdForUser,
    getRawActiveStreamsForChannel,
    getRawApplicationStreamsForChannel,
    getRawStreamForUser,
    getStreamingUserIdsForChannel,
    mergeStreamArrays
} from "@plugins/showHiddenChannels/utils/stream";
import { ChannelStore, GuildMemberStore, UserStore } from "@webpack/common";

type AnyFunction = (...args: any[]) => any;
type VoiceStates = Record<string, any>;
type FunctionKeys<T extends object> = {
    [K in keyof T]-?: NonNullable<T[K]> extends AnyFunction ? K : never;
}[keyof T];
type OriginalMethods<TStore extends object> = Partial<{
    [K in FunctionKeys<TStore>]: NonNullable<TStore[K]>;
}>;

interface HiddenChannelContext {
    channelId: string;
    guildId: string | null;
    streamingUserIds: Set<string>;
}

const applicationStreamingStoreMethodKeys = [
    "getAllActiveStreamsForChannel",
    "getAllApplicationStreamsForChannel",
    "getAnyDiscoverableStreamForUser"
] as const satisfies readonly FunctionKeys<typeof ApplicationStreamingStore>[];

const voiceStateStoreMethodKeys = [
    "getVoiceStateForUser",
    "getVoiceStateForChannel",
    "getVoiceStatesForChannel",
    "getVoiceStates",
    "getDiscoverableVoiceStateForUser",
    "getDiscoverableVoiceState",
    "getVoiceState"
] as const satisfies readonly FunctionKeys<typeof VoiceStateStore>[];

const channelRTCStoreMethodKeys = [
    "getParticipant",
    "getParticipants",
    "getFilteredParticipants",
    "getSpeakingParticipants",
    "getSelectedParticipant",
    "getStreamParticipants"
] as const satisfies readonly FunctionKeys<typeof ChannelRTCStore>[];

const originalApplicationStreamingStoreMethods: OriginalMethods<typeof ApplicationStreamingStore> = {};
const originalVoiceStateStoreMethods: OriginalMethods<typeof VoiceStateStore> = {};
const originalChannelRTCStoreMethods: OriginalMethods<typeof ChannelRTCStore> = {};

function isFunction(value: unknown): value is AnyFunction {
    return typeof value === "function";
}

function patchMethod<TStore extends object, TKey extends FunctionKeys<TStore>>(
    store: TStore,
    originals: OriginalMethods<TStore>,
    key: TKey,
    createPatchedMethod: (originalMethod: NonNullable<TStore[TKey]>) => NonNullable<TStore[TKey]>
) {
    const currentMethod = store[key];
    if (!isFunction(currentMethod)) return;

    const originalMethod = (originals[key] ?? currentMethod.bind(store)) as NonNullable<TStore[TKey]>;
    originals[key] = originalMethod;
    store[key] = createPatchedMethod(originalMethod) as TStore[TKey];
}

function restorePatchedMethods<TStore extends object, TKey extends FunctionKeys<TStore>>(
    store: TStore,
    originals: OriginalMethods<TStore>,
    keys: readonly TKey[]
) {
    for (const key of keys) {
        const originalMethod = originals[key];
        if (originalMethod != null) {
            store[key] = originalMethod as TStore[TKey];
        }
    }
}

function cloneWithPrototype(original: unknown, fallback: Record<string, any>) {
    return original != null && typeof original === "object"
        ? Object.assign(Object.create(Object.getPrototypeOf(original)), original)
        : { ...fallback };
}

function buildHiddenStreamId(channelId: string, userId: string) {
    return `hidden-stream:${channelId}:${userId}`;
}

function getGuildIdForChannel(channelId: string | bigint) {
    return ChannelStore.getChannel(String(channelId))?.guild_id ?? null;
}

function getHiddenChannelContext(channelId: string | bigint): HiddenChannelContext | null {
    const resolvedChannelId = String(channelId);
    if (!isHiddenChannel({ channelId: resolvedChannelId })) return null;

    return {
        channelId: resolvedChannelId,
        guildId: getGuildIdForChannel(resolvedChannelId),
        streamingUserIds: getStreamingUserIdsForChannel(resolvedChannelId)
    };
}

function getParticipantUserId(participant: any, fallbackUserId?: string | null) {
    return participant?.user?.id ?? participant?.voiceState?.userId ?? fallbackUserId ?? null;
}

function getStreamParticipantUserId(participant: any) {
    return participant?.user?.id ?? participant?.stream?.ownerId ?? null;
}

function getSeenUserIds(participants: unknown[], getUserId: (participant: any) => string | null) {
    return new Set(participants
        .map(getUserId)
        .filter((userId): userId is string => Boolean(userId))
        .map(String));
}

function appendMissingParticipants(
    participants: any[],
    streamingUserIds: Set<string>,
    seenUserIds: Set<string>,
    createParticipant: (userId: string) => any
) {
    for (const userId of streamingUserIds) {
        if (seenUserIds.has(userId)) continue;

        const participant = createParticipant(userId);
        if (!participant) continue;

        participants.push(participant);
        seenUserIds.add(userId);
    }
}

function ensureVoiceStateMethods(voiceState: any) {
    if (typeof voiceState.isVoiceMuted !== "function") {
        voiceState.isVoiceMuted = function () {
            return !!this.mute || !!this.selfMute;
        };
    }

    if (typeof voiceState.isVoiceDeafened !== "function") {
        voiceState.isVoiceDeafened = function () {
            return !!this.deaf || !!this.selfDeaf;
        };
    }
}

function createForcedLiveVoiceState(original: any, userId: string, channelId: string) {
    const voiceState = cloneWithPrototype(original, {
        userId,
        channelId,
        sessionId: null,
        mute: false,
        deaf: false,
        selfMute: false,
        selfDeaf: false,
        selfVideo: false,
        selfStream: false,
        suppress: false,
        requestToSpeakTimestamp: null,
        discoverable: true
    });

    voiceState.userId ??= userId;
    voiceState.channelId = channelId;
    voiceState.selfStream = true;
    ensureVoiceStateMethods(voiceState);

    return voiceState;
}

function withForcedHiddenLiveVoiceState(original: any, userId: string | bigint | null | undefined, guildId?: string | null) {
    const resolvedUserId = userId == null ? null : String(userId);
    if (!resolvedUserId) return original;

    const hiddenStreamChannelId = getHiddenStreamChannelIdForUser(resolvedUserId, guildId);
    return hiddenStreamChannelId == null
        ? original
        : createForcedLiveVoiceState(original, resolvedUserId, hiddenStreamChannelId);
}

function withForcedHiddenLiveVoiceStatesForChannel(states: VoiceStates | null | undefined, channelId: string | bigint): VoiceStates {
    const context = getHiddenChannelContext(channelId);
    if (context == null) return states ?? {};

    const nextStates = {
        ...(states ?? {})
    };

    for (const userId of context.streamingUserIds) {
        nextStates[userId] = createForcedLiveVoiceState(nextStates[userId], userId, context.channelId);
    }

    return nextStates;
}

function withForcedHiddenLiveVoiceStatesForGuild(states: VoiceStates | null | undefined, guildId?: string | null): VoiceStates {
    const nextStates = {
        ...(states ?? {})
    };

    for (const stream of [
        ...(ApplicationStreamingStore.getAllApplicationStreams?.() ?? []),
        ...(ApplicationStreamingStore.getAllActiveStreams?.() ?? [])
    ]) {
        if (stream == null || typeof stream !== "object") continue;

        const { guildId: streamGuildId, ownerId, channelId } = stream as StreamLike;
        if (!ownerId || !channelId) continue;
        if (guildId != null && streamGuildId != null && String(streamGuildId) !== String(guildId)) continue;
        if (!isHiddenChannel({ channelId: String(channelId) })) continue;

        nextStates[ownerId] = createForcedLiveVoiceState(nextStates[ownerId], ownerId, String(channelId));
    }

    return nextStates;
}

function createForcedLiveParticipant(original: any, userId: string, channelId: string, guildId?: string | null) {
    const voiceState = createForcedLiveVoiceState(
        original?.voiceState
        ?? VoiceStateStore.getVoiceStateForChannel?.(channelId, userId)
        ?? VoiceStateStore.getVoiceState?.(guildId ?? null, userId)
        ?? null,
        userId,
        channelId
    );
    const user = UserStore.getUser(userId);
    if (!user) return original;

    const participant = cloneWithPrototype(original, {});

    participant.id ??= userId;
    participant.type ??= PARTICIPANT_TYPE_USER;
    participant.user = user;
    participant.voiceState = voiceState;
    participant.voicePlatform ??= null;
    participant.speaking ??= false;
    participant.voiceDb ??= 0;
    participant.latched ??= false;
    participant.lastSpoke ??= 0;
    participant.soundsharing = true;
    participant.ringing ??= false;
    participant.userNick ??= guildId == null ? null : GuildMemberStore.getNick(guildId, userId);
    participant.userAvatarDecoration ??= null;
    participant.localVideoDisabled ??= false;
    participant.userVideo ??= !!voiceState?.selfVideo;
    participant.streamId ??= buildHiddenStreamId(channelId, userId);

    return participant;
}

function createForcedLiveStreamParticipant(original: any, userId: string, channelId: string, guildId?: string | null) {
    const user = UserStore.getUser(userId);
    const stream = getRawStreamForUser(userId, guildId);
    if (!user || !stream) return original;

    const participant = cloneWithPrototype(original, {});

    participant.id ??= buildHiddenStreamId(channelId, userId);
    participant.type ??= PARTICIPANT_TYPE_STREAM;
    participant.user = user;
    participant.userNick ??= guildId == null ? null : GuildMemberStore.getNick(guildId, userId);
    participant.userVideo ??= false;
    participant.stream = stream;
    participant.streamId ??= buildHiddenStreamId(channelId, userId);

    return participant;
}

function withForcedHiddenLiveParticipantInContext(participant: any, context: HiddenChannelContext, fallbackUserId?: string | null) {
    const userId = getParticipantUserId(participant, fallbackUserId);
    if (!userId || !context.streamingUserIds.has(String(userId))) {
        return participant;
    }

    return createForcedLiveParticipant(participant, String(userId), context.channelId, context.guildId);
}

function withForcedHiddenLiveParticipant(participant: any, channelId: string | bigint, fallbackUserId?: string | null) {
    const context = getHiddenChannelContext(channelId);
    return context == null
        ? participant
        : withForcedHiddenLiveParticipantInContext(participant, context, fallbackUserId);
}

function withForcedHiddenParticipants(
    participants: unknown[] | null | undefined,
    channelId: string | bigint,
    mapExistingParticipant: (participant: any, context: HiddenChannelContext) => any,
    getSeenUserId: (participant: any) => string | null,
    createMissingParticipant: (userId: string, context: HiddenChannelContext) => any
) {
    const context = getHiddenChannelContext(channelId);
    if (context == null) return participants ?? [];

    const nextParticipants = Array.isArray(participants)
        ? participants.map(participant => mapExistingParticipant(participant, context))
        : [];
    const seenUserIds = getSeenUserIds(nextParticipants, getSeenUserId);

    appendMissingParticipants(
        nextParticipants,
        context.streamingUserIds,
        seenUserIds,
        userId => createMissingParticipant(userId, context)
    );

    return nextParticipants;
}

function withForcedHiddenLiveParticipants(participants: unknown[] | null | undefined, channelId: string | bigint) {
    return withForcedHiddenParticipants(
        participants,
        channelId,
        (participant, context) => withForcedHiddenLiveParticipantInContext(participant, context),
        getParticipantUserId,
        (userId, context) => createForcedLiveParticipant(null, userId, context.channelId, context.guildId)
    );
}

function withForcedHiddenLiveStreamParticipants(participants: unknown[] | null | undefined, channelId: string | bigint) {
    return withForcedHiddenParticipants(
        participants,
        channelId,
        participant => participant,
        getStreamParticipantUserId,
        (userId, context) => createForcedLiveStreamParticipant(null, userId, context.channelId, context.guildId)
    );
}

function patchApplicationStreamingStore() {
    patchMethod(ApplicationStreamingStore, originalApplicationStreamingStoreMethods, "getAllActiveStreamsForChannel", originalMethod =>
        channelId => mergeStreamArrays(originalMethod(channelId), getRawActiveStreamsForChannel(channelId))
    );

    patchMethod(ApplicationStreamingStore, originalApplicationStreamingStoreMethods, "getAllApplicationStreamsForChannel", originalMethod =>
        channelId => mergeStreamArrays(originalMethod(channelId), getRawApplicationStreamsForChannel(channelId))
    );

    patchMethod(ApplicationStreamingStore, originalApplicationStreamingStoreMethods, "getAnyDiscoverableStreamForUser", originalMethod =>
        userId => originalMethod(userId) ?? ApplicationStreamingStore.getAnyStreamForUser?.(userId) ?? null
    );
}

function patchVoiceStateStore() {
    patchMethod(VoiceStateStore, originalVoiceStateStoreMethods, "getVoiceStateForUser", originalMethod =>
        userId => withForcedHiddenLiveVoiceState(originalMethod(userId), userId)
    );

    patchMethod(VoiceStateStore, originalVoiceStateStoreMethods, "getVoiceStateForChannel", originalMethod =>
        (channelId, userId) => {
            const originalVoiceState = originalMethod(channelId, userId);
            const guildId = getGuildIdForChannel(channelId);

            if (userId != null) {
                return withForcedHiddenLiveVoiceState(originalVoiceState, userId, guildId);
            }

            if (originalVoiceState != null) {
                return withForcedHiddenLiveVoiceState(originalVoiceState, (originalVoiceState as VoiceStateLike)?.userId, guildId);
            }

            const firstStreamingUserId = getStreamingUserIdsForChannel(channelId).values().next().value as string | undefined;
            return firstStreamingUserId == null
                ? originalVoiceState
                : createForcedLiveVoiceState(null, firstStreamingUserId, String(channelId));
        }
    );

    patchMethod(VoiceStateStore, originalVoiceStateStoreMethods, "getVoiceStatesForChannel", originalMethod =>
        channelId => withForcedHiddenLiveVoiceStatesForChannel(originalMethod(channelId), channelId)
    );

    patchMethod(VoiceStateStore, originalVoiceStateStoreMethods, "getVoiceStates", originalMethod =>
        guildId => withForcedHiddenLiveVoiceStatesForGuild(originalMethod(guildId), guildId)
    );

    patchMethod(VoiceStateStore, originalVoiceStateStoreMethods, "getDiscoverableVoiceStateForUser", originalMethod =>
        userId => withForcedHiddenLiveVoiceState(originalMethod(userId) ?? VoiceStateStore.getVoiceStateForUser?.(userId) ?? null, userId)
    );

    patchMethod(VoiceStateStore, originalVoiceStateStoreMethods, "getDiscoverableVoiceState", originalMethod =>
        (guildId, userId) =>
            withForcedHiddenLiveVoiceState(
                originalMethod(guildId, userId) ?? VoiceStateStore.getVoiceState?.(guildId, userId) ?? null,
                userId,
                guildId
            )
    );

    patchMethod(VoiceStateStore, originalVoiceStateStoreMethods, "getVoiceState", originalMethod =>
        (guildId, userId) => withForcedHiddenLiveVoiceState(originalMethod(guildId, userId), userId, guildId)
    );
}

function patchChannelRTCStore() {
    patchMethod(ChannelRTCStore, originalChannelRTCStoreMethods, "getParticipant", originalMethod =>
        (channelId, participantId) => withForcedHiddenLiveParticipant(originalMethod(channelId, participantId), channelId, String(participantId))
    );

    patchMethod(ChannelRTCStore, originalChannelRTCStoreMethods, "getParticipants", originalMethod =>
        channelId => withForcedHiddenLiveParticipants(originalMethod(channelId), channelId)
    );

    patchMethod(ChannelRTCStore, originalChannelRTCStoreMethods, "getFilteredParticipants", originalMethod =>
        channelId => withForcedHiddenLiveParticipants(originalMethod(channelId), channelId)
    );

    patchMethod(ChannelRTCStore, originalChannelRTCStoreMethods, "getSpeakingParticipants", originalMethod =>
        channelId => withForcedHiddenLiveParticipants(originalMethod(channelId), channelId)
    );

    patchMethod(ChannelRTCStore, originalChannelRTCStoreMethods, "getSelectedParticipant", originalMethod =>
        channelId => withForcedHiddenLiveParticipant(originalMethod(channelId), channelId)
    );

    patchMethod(ChannelRTCStore, originalChannelRTCStoreMethods, "getStreamParticipants", originalMethod =>
        channelId => withForcedHiddenLiveStreamParticipants(originalMethod(channelId), channelId)
    );
}

export function installStorePatches() {
    patchApplicationStreamingStore();
    patchVoiceStateStore();
    patchChannelRTCStore();
}

export function restoreStorePatches() {
    restorePatchedMethods(ApplicationStreamingStore, originalApplicationStreamingStoreMethods, applicationStreamingStoreMethodKeys);
    restorePatchedMethods(VoiceStateStore, originalVoiceStateStoreMethods, voiceStateStoreMethodKeys);
    restorePatchedMethods(ChannelRTCStore, originalChannelRTCStoreMethods, channelRTCStoreMethodKeys);
}
