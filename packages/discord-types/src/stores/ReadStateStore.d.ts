/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { GuildRecord } from "../general";
import type { ReadState, ReadStateSnapshot, ReadStateType, SerializedReadState } from "../general/ReadState";
import type { Nullish } from "../internal";
import type { FluxStore } from "./abstract/FluxStore";

export type ReadStateStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC_CHANNEL_MESSAGES" | "BULK_ACK" | "CACHE_LOADED" | "CHANNEL_ACK" | "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_LOCAL_ACK" | "CHANNEL_PINS_ACK" | "CHANNEL_PINS_UPDATE" | "CHANNEL_RTC_UPDATE_CHAT_OPEN" | "CHANNEL_SELECT" | "CLEAR_OLDEST_UNREAD_MESSAGE" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "CURRENT_USER_UPDATE" | "DECAY_READ_STATES" | "DISABLE_AUTOMATIC_ACK" | "DRAWER_CLOSE" | "DRAWER_OPEN" | "ENABLE_AUTOMATIC_ACK" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_FEATURE_ACK" | "GUILD_SCHEDULED_EVENT_CREATE" | "GUILD_SCHEDULED_EVENT_DELETE" | "GUILD_SCHEDULED_EVENT_UPDATE" | "GUILD_UPDATE" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_THREADS_SUCCESS" | "LOGOUT" | "MESSAGE_ACK" | "MESSAGE_CREATE" | "MESSAGE_DELETE" | "MESSAGE_DELETE_BULK" | "MESSAGE_REQUEST_ACK" | "MESSAGE_REQUEST_CLEAR_ACK" | "MOD_VIEW_SEARCH_FINISH" | "NOTIFICATION_CENTER_ITEMS_ACK" | "NOTIFICATION_CENTER_ITEM_CREATE" | "OVERLAY_INITIALIZE" | "PASSIVE_UPDATE_V2" | "RELATIONSHIP_ADD" | "RELATIONSHIP_REMOVE" | "RESORT_THREADS" | "SEARCH_FINISH" | "THREAD_CREATE" | "THREAD_DELETE" | "THREAD_LIST_SYNC" | "THREAD_MEMBERS_UPDATE" | "THREAD_MEMBER_UPDATE" | "THREAD_UPDATE" | "TRY_ACK" | "UPDATE_CHANNEL_DIMENSIONS" | "USER_NON_CHANNEL_ACK" | "VOICE_CHANNEL_SELECT" | "WINDOW_FOCUS">;

export class ReadStateStore<Action extends FluxAction = ReadStateStoreAction> extends FluxStore<Action> {
    static displayName: "ReadStateStore";

    ackMessageId(e?: any, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): any; // TEMP
    getAllReadStates(e?: any): SerializedReadState; // TEMP
    getForDebugging(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): ReadState;
    getGuildChannelUnreadState(e?: any, t?: any, n?: any, i?: any, r?: any): any; // TEMP
    getGuildUnreadsSentinel(e?: any): any; // TEMP
    getMentionChannelIds(): string[];
    getMentionCount(channelId: string): number;
    getNonChannelAckId(e?: any): any; // TEMP
    getNotifCenterReadState(e?: any): any; // TEMP
    getOldestUnreadMessageId(e?: any, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): any; // TEMP
    getOldestUnreadTimestamp(e?: any, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): any; // TEMP
    getReadStatesByChannel(): { [channelId: string]: ReadState; };
    getSnapshot(e?: any, t?: any): ReadStateSnapshot; // TEMP
    getTrackedAckMessageId(e?: any, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): any; // TEMP
    getUnreadCount(channelId: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): number;
    hasOpenedThread(channelId: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean;
    hasRecentlyVisitedAndRead(e?: any, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean; // TEMP
    hasTrackedUnread(e?: any, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean; // TEMP
    hasUnread(channelId: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean;
    hasUnreadPins(channelId: string): boolean;
    isEstimated(channelId: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean;
    isForumPostUnread(threadId: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean;
    isNewForumThread(forumThreadId: string, forumId: string, guild?: GuildRecord | Nullish): boolean;
    /**
     * Returns the ID of the last message in the channel associated with the specified ID.
     * @returns The ID of the channel's last message or null if no messages have ever been sent in the channel. If the channel has not been fetched, null is returned.
     */
    lastMessageId(channelId: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): string | null;
    /**
     * Returns the timestamp of the last message in the channel associated with the specified ID.
     * @returns The timestamp of the channel's last message or 0 if no messages have ever been sent in the channel. If the channel has not been fetched, 0 is returned.
     */
    lastMessageTimestamp(channelId: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): number;
    /**
     * Returns the timestamp of the last pin in the channel associated with the specified ID.
     * @returns The timestamp of the channel's last pin or 0 if the channel has no pins. If the channel has not been fetched, null is returned.
     */
    lastPinTimestamp(channelId: string): number | null;
}
