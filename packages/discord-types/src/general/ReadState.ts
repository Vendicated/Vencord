/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish, Optional } from "../internal";
import type { BasicPermissionsObject } from "../stores/PermissionStore";
import type { GuildChannelRecord } from "./channels/ChannelRecord";

export declare class ReadState<Type extends ReadStateType = ReadStateType> {
    constructor(channelId: string, type?: ChannelIdReadStateType | undefined);
    constructor(userId: string, type: UserIdReadStateType);
    constructor(guildId: string, type: GuildIdReadStateType);

    static _guildReadStateSentinels: { [guildId: string]: { unreadsSentinel: number; }; };
    static _mentionChannels: Set<string>;
    static _readStates: { [T in ChannelIdReadStateType]?: { [channelId: string]: ReadState<T>; }; }
        & { [T in UserIdReadStateType]?: { [userId: string]: ReadState<T>; }; }
        & { [T in GuildIdReadStateType]?: { [guildId: string]: ReadState<T>; }; };
    static clear<T extends ChannelIdReadStateType | undefined>(channelId: string, type?: T): boolean;
    static clear<T extends UserIdReadStateType>(userId: string, type: T): boolean;
    static clear<T extends GuildIdReadStateType>(guildId: string, type: T): boolean;
    static clearAll(): void;
    static forEach(callback: (value: ReadState) => unknown): void;
    static get<T extends ChannelIdReadStateType | undefined>(channelId: string, type?: T): ReadState<ChannelIdReadStateType>;
    static get<T extends UserIdReadStateType>(userId: string, type: T): ReadState<T>;
    static get<T extends GuildIdReadStateType>(guildId: string, type: T): ReadState<T>;
    static getGuildSentinels(guildId: string): typeof ReadState["_guildReadStateSentinels"];
    static getIfExists<T extends ChannelIdReadStateType | undefined>(channelId: string, type?: T): ReadState<ChannelIdReadStateType> | undefined;
    static getIfExists<T extends UserIdReadStateType>(userId: string, type: T): ReadState<T> | undefined;
    static getIfExists<T extends GuildIdReadStateType>(guildId: string, type: T): ReadState<T> | undefined;
    static getMentionChannelIds(): string[];
    static getValue<T extends ChannelIdReadStateType | undefined, GetterReturn, DefaultValue = undefined>(
        channelId: string,
        type: T,
        getter: (readState: ReadState<ChannelIdReadStateType> | undefined) => GetterReturn,
        defaultValue?: DefaultValue
    ): GetterReturn | DefaultValue;
    static getValue<T extends UserIdReadStateType, GetterReturn, DefaultValue = undefined>(
        userId: string,
        type: T,
        getter: (readState: ReadState<T> | undefined) => GetterReturn,
        defaultValue?: DefaultValue
    ): GetterReturn | DefaultValue;
    static getValue<T extends GuildIdReadStateType, GetterReturn, DefaultValue = undefined>(
        guildId: string,
        type: T,
        getter: (readState: ReadState<T> | undefined) => GetterReturn,
        defaultValue?: DefaultValue
    ): GetterReturn | DefaultValue;
    static resetGuildSentinels(): void;

    _ack(location: string, trackAnalytics: boolean): void;
    _nonChannelAck(): void;
    _shouldAck(
        force?: boolean | undefined,
        local?: boolean | undefined,
        isExplicitUserAction?: boolean | undefined
    ): boolean;
    ack(options: {
        force?: boolean | undefined /* = false */;
        immediate?: boolean | undefined /* = false */;
        isExplicitUserAction?: boolean | undefined /* = false */;
        local?: boolean | undefined /* = false */;
        location?: { section: string; } /* = { section: AnalyticsSections.CHANNEL } */;
        messageId?: string | Nullish /* = this.lastMessageId */;
        trackAnalytics?: boolean | undefined /* = true */;
    }): boolean;
    get ackMessageId(): this["_ackMessageId"];
    set ackMessageId(messageId: this["_ackMessageId"]);
    ackPins(isoTimestamp?: string | Nullish): boolean;
    canBeUnread(): boolean;
    canHaveMentions(): boolean;
    canTrackUnreads(): boolean;
    clearOutgoingAck(): void;
    delete(remote?: boolean | undefined): void;
    deserializeForOverlay(serlizedReadState: Optional<SerializedReadState<false, Type>, Nullish, "_isJoinedThread" | "estimated" | "_isActiveThread" | "isManualAck" | "_isThread" | "loadedMessages" | "oldestUnreadMessageIdStale" | "type"> & {
        _isActiveJoinedThread?: boolean | Nullish;
        _unreadCount?: number | Nullish;
    }): void;
    getAckTimestamp(): number;
    getGuildChannelUnreadState(
        guildChannel: BasicPermissionsObject | GuildChannelRecord,
        isOptInEnabled: boolean,
        guildChannelOverrides: { [channelId: string]: GuildChannelOverride; },
        isChannelMuted: boolean,
        isReadStateTypeUnread?: boolean | undefined
    ): {
        mentionCount: number;
        unread: boolean;
    };
    getMentionCount(): number;
    guessAckMessageId(): string | null;
    get guildId(): GuildIdFromReadStateType<Type>;
    handleGuildEventRemoval(guildId: string, guildEventId: string): void;
    hasMentions(): boolean;
    hasRecentlyVisitedAndRead(): boolean;
    hasUnread(): boolean;
    hasUnreadOrMentions(): boolean;
    incrementGuildUnreadsSentinel(): void;
    isForumPostUnread(): boolean;
    isPrivate(): boolean;
    get lastMessageId(): this["_lastMessageId"];
    set lastMessageId(messageId: this["_lastMessageId"] | Nullish);
    get lastMessageTimestamp(): this["_lastMessageTimestamp"];
    get mentionCount(): this["_mentionCount"];
    set mentionCount(count: this["_mentionCount"]);
    get oldestUnreadMessageId(): this["_oldestUnreadMessageId"];
    set oldestUnreadMessageId(messageId: this["_oldestUnreadMessageId"]);
    get oldestUnreadTimestamp(): number;
    rebuildChannelState(
        ackMessageId?: string | Nullish,
        resetMentionCount?: boolean | undefined /* = false */,
        newMentionCount?: number | Nullish
    ): void;
    recalculateFlags(): ReadStateFlags | undefined;
    recordLastViewedTime(): void;
    serialize<ForCache extends boolean>(forCache: ForCache): SerializedReadState<ForCache, Type>;
    shouldDeleteReadState(expirationTimestamp: string): boolean;
    syncThreadSettings(): boolean;
    takeSnapshot(): ReadStateSnapshot;
    get unreadCount(): number;
    set unreadCount(count: number);

    _ackMessageId: string | null;
    _ackMessageTimestamp: number;
    _guildId: GuildIdFromReadStateType<Type> | null;
    _isActiveThread: boolean;
    _isJoinedThread: boolean;
    _isResourceChannel: boolean;
    _isThread: boolean;
    _lastMessageId: string | null;
    _lastMessageTimestamp: number;
    _mentionCount: number;
    _oldestUnreadMessageId: string | null;
    _persisted: boolean;
    _unreadCount: number;
    ackedWhileCached: undefined;
    ackMessageIdAtChannelSelect: string | null;
    ackPinTimestamp: number;
    /**
     * Not always a channel ID.
     * @see {@link ReadState}
     */
    channelId: string;
    estimated: boolean;
    flags: ReadStateFlags | undefined;
    isManualAck: boolean;
    lastPinTimestamp: number;
    lastViewed: number | undefined;
    loadedMessages: boolean;
    oldestUnreadMessageIdStale: boolean;
    outgoingAck: string | null;
    outgoingAckTimer: number | null;
    snapshot: ReadStateSnapshot | undefined;
    type: Type;
}

export type SerializedReadState<ForCache extends boolean = boolean, Type extends ReadStateType = ReadStateType>
    = ForCache extends true
        ? SerializedForCache<Type>
        : Serialized<Type>;

type SerializedForCache<Type extends ReadStateType> = Pick<ReadState<Type>, "_ackMessageId" | "_ackMessageTimestamp" | "_guildId" | "_isActiveThread" | "_isJoinedThread" | "_isThread" | "_lastMessageId" | "_lastMessageTimestamp" | "_mentionCount" | "_persisted" | "ackPinTimestamp" | "channelId" | "flags" | "lastPinTimestamp" | "lastViewed" | "type">;

type Serialized<Type extends ReadStateType> = SerializedForCache<Type> & Pick<ReadState<Type>, "_oldestUnreadMessageId" | "estimated" | "isManualAck" | "loadedMessages" | "oldestUnreadMessageIdStale">;

export interface GuildChannelOverride {
    channel_id: string;
    collapsed: boolean;
    flags?: ChannelNotificationSettingsFlags;
    message_notifications: number;
    mute_config: GuildChannelOverrideMuteConfig | null;
    muted: boolean;
}

export enum ChannelNotificationSettingsFlags {
    UNREADS_ONLY_MENTIONS = 1 << 9,
    UNREADS_ALL_MESSAGES = 1 << 10,
    FAVORITED = 1 << 11,
    OPT_IN_ENABLED = 1 << 12,
    NEW_FORUM_THREADS_OFF = 1 << 13,
    NEW_FORUM_THREADS_ON = 1 << 14,
}

export interface GuildChannelOverrideMuteConfig {
    end_time: string | null;
    selected_time_window: number | null;
}

export interface ReadStateSnapshot {
    guildMentionCount: number;
    guildUnread: boolean;
    mentionCount: number;
    takenAt: number;
    unread: boolean;
}

export enum ReadStateFlags {
    IS_GUILD_CHANNEL = 1 << 0,
    IS_THREAD = 1 << 1,
}

export type ChannelIdReadStateType = ReadStateType.CHANNEL;

export type UserIdReadStateType = ReadStateType.NOTIFICATION_CENTER | ReadStateType.MESSAGE_REQUESTS;

export type GuildIdReadStateType = ReadStateType.GUILD_EVENT | ReadStateType.GUILD_HOME | ReadStateType.GUILD_ONBOARDING_QUESTION;

// Original name: ReadStateTypes
export enum ReadStateType {
    CHANNEL = 0,
    GUILD_EVENT = 1,
    NOTIFICATION_CENTER = 2,
    GUILD_HOME = 3,
    GUILD_ONBOARDING_QUESTION = 4,
    MESSAGE_REQUESTS = 5,
}

type GuildIdFromReadStateType<Type extends ReadStateType> = Type extends UserIdReadStateType ? null : string;
