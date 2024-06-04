/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export class ReadState {
    constructor(
        channelId?: string | undefined,
        readStateType?: ReadStateType | undefined /* = ReadStateType.CHANNEL */
    );

    static clear(e?: any, t?: any): any; // TEMP
    static clearAll(): void;
    static forEach(e?: any): void; // TEMP
    static get(e?: any, t?: any): any; // TEMP
    static getGuildSentinels(e?: any): any; // TEMP
    static getIfExists(e?: any, t?: any): any; // TEMP
    static getMentionChannelIds(): any; // TEMP
    static getValue(e?: any, t?: any, n?: any, i?: any): any; // TEMP
    static resetGuildSentinels(): void;

    _ack(e?: any, t?: any): void; // TEMP
    _nonChannelAck(): void;
    _shouldAck(e?: any, t?: any, n?: any): boolean; // TEMP
    ack(e?: any): boolean; // TEMP
    get ackMessageId(): any; // TEMP
    set ackMessageId(e: any); // TEMP
    ackPins(t?: any): boolean; // TEMP
    canBeUnread(): boolean;
    canHaveMentions(): boolean;
    canTrackUnreads(): boolean;
    clearOutgoingAck(): void;
    delete(t?: any): void; // TEMP
    deserializeForOverlay(e?: any): any; // TEMP
    getAckTimestamp(): any; // TEMP
    getGuildChannelUnreadState(e?: any, t?: any, n?: any, i?: any, r?: any): any; // TEMP
    getMentionCount(): number;
    guessAckMessageId(): any; // TEMP
    get guildId(): any; // TEMP
    handleGuildEventRemoval(e?: any, t?: any): void; // TEMP
    hasMentions(): boolean;
    hasRecentlyVisitedAndRead(): boolean;
    hasUnread(): boolean;
    hasUnreadOrMentions(): boolean;
    incrementGuildUnreadsSentinel(): void;
    isForumPostUnread(): boolean;
    isPrivate(): boolean;
    get lastMessageId(): any; // TEMP
    set lastMessageId(e: any); // TEMP
    get lastMessageTimestamp(): any; // TEMP
    get mentionCount(): any; // TEMP
    set mentionCount(e: any); // TEMP
    get oldestUnreadMessageId(): any; // TEMP
    set oldestUnreadMessageId(e: any); // TEMP
    get oldestUnreadTimestamp(): number;
    rebuildChannelState(e?: any, t?: any, n?: any): void; // TEMP
    recalculateFlags(): ReadStateFlags | undefined;
    recordLastViewedTime(): void;
    serialize(e?: any): SerializedReadState; // TEMP
    shouldDeleteReadState(e?: any): boolean;
    syncThreadSettings(): boolean;
    takeSnapshot(): ReadStateSnapshot;
    get unreadCount(): number;
    set unreadCount(count: number); // TEMP

    _ackMessageId: string | number | null;
    _ackMessageTimestamp: number;
    _guildId: string | null;
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
    ackMessageIdAtChannelSelect: string | number | null;
    ackPinTimestamp: number;
    channelId: string | undefined;
    estimated: boolean;
    flags: ReadStateFlags | undefined;
    isManualAck: boolean;
    lastPinTimestamp: number;
    lastViewed: number | undefined;
    loadedMessages: boolean;
    oldestUnreadMessageIdStale: boolean;
    outgoingAck: any/* | null */; // TEMP
    outgoingAckTimer: any/* | null */; // TEMP
    snapshot: ReadStateSnapshot | undefined;
    type: ReadStateType;
}

export interface ReadStateSnapshot {
    guildMentionCount: number;
    guildUnread: boolean;
    mentionCount: number;
    takenAt: number;
    unread: boolean;
}

/** @todo Come up with a name for each union member. */
export type SerializedReadState = {
    _ackMessageId: string | number | null;
    _ackMessageTimestamp: number;
    _guildId: string | null;
    _isActiveThread?: boolean;
    _isJoinedThread?: boolean;
    _isThread?: boolean;
    _lastMessageId: string | null;
    _lastMessageTimestamp: number;
    _mentionCount: number;
    _persisted: boolean;
    ackPinTimestamp: number;
    channelId: string | undefined;
    flags: ReadStateFlags | undefined;
    lastPinTimestamp: number;
    lastViewed?: number;
    type: ReadStateType;
} | {
    _ackMessageId: string | number | null;
    _ackMessageTimestamp: number;
    _guildId: string | null;
    _isActiveThread: boolean;
    _isJoinedThread: boolean;
    _isThread: boolean;
    _lastMessageId: string | null;
    _lastMessageTimestamp: number;
    _mentionCount: number;
    _oldestUnreadMessageId: string | null;
    _persisted: boolean;
    ackPinTimestamp: number;
    channelId: string | undefined;
    estimated: boolean;
    flags: ReadStateFlags | undefined;
    isManualAck: boolean;
    lastPinTimestamp: number;
    lastViewed: number | undefined;
    loadedMessages: boolean;
    oldestUnreadMessageIdStale: boolean;
    type: ReadStateType;
};

export const enum ReadStateFlags {
    IS_GUILD_CHANNEL = 1 << 0,
    IS_THREAD = 1 << 1,
}

// Original name: ReadStateTypes
export const enum ReadStateType {
    CHANNEL = 0,
    GUILD_EVENT = 1,
    NOTIFICATION_CENTER = 2,
    GUILD_HOME = 3,
    GUILD_ONBOARDING_QUESTION = 4,
    MESSAGE_REQUESTS = 5,
}
