/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { FluxStore } from "./abstract/FluxStore";

export type ReadStateStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC_CHANNEL_MESSAGES" | "BULK_ACK" | "CACHE_LOADED" | "CHANNEL_ACK" | "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_LOCAL_ACK" | "CHANNEL_PINS_ACK" | "CHANNEL_PINS_UPDATE" | "CHANNEL_RTC_UPDATE_CHAT_OPEN" | "CHANNEL_SELECT" | "CLEAR_OLDEST_UNREAD_MESSAGE" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "CURRENT_USER_UPDATE" | "DECAY_READ_STATES" | "DISABLE_AUTOMATIC_ACK" | "DRAWER_CLOSE" | "DRAWER_OPEN" | "ENABLE_AUTOMATIC_ACK" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_FEATURE_ACK" | "GUILD_SCHEDULED_EVENT_CREATE" | "GUILD_SCHEDULED_EVENT_DELETE" | "GUILD_SCHEDULED_EVENT_UPDATE" | "GUILD_UPDATE" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_THREADS_SUCCESS" | "LOGOUT" | "MESSAGE_ACK" | "MESSAGE_CREATE" | "MESSAGE_DELETE" | "MESSAGE_DELETE_BULK" | "MESSAGE_REQUEST_ACK" | "MESSAGE_REQUEST_CLEAR_ACK" | "MOD_VIEW_SEARCH_FINISH" | "NOTIFICATION_CENTER_ITEMS_ACK" | "NOTIFICATION_CENTER_ITEM_CREATE" | "OVERLAY_INITIALIZE" | "PASSIVE_UPDATE_V2" | "RELATIONSHIP_ADD" | "RELATIONSHIP_REMOVE" | "RESORT_THREADS" | "SEARCH_FINISH" | "THREAD_CREATE" | "THREAD_DELETE" | "THREAD_LIST_SYNC" | "THREAD_MEMBERS_UPDATE" | "THREAD_MEMBER_UPDATE" | "THREAD_UPDATE" | "TRY_ACK" | "UPDATE_CHANNEL_DIMENSIONS" | "USER_NON_CHANNEL_ACK" | "VOICE_CHANNEL_SELECT" | "WINDOW_FOCUS">;

export class ReadStateStore<Action extends FluxAction = ReadStateStoreAction> extends FluxStore<Action> {
    static displayName: "ReadStateStore";

    ackMessageId(e?: any): any; // TEMP
    getAllReadStates(e?: any): any; // TEMP
    getForDebugging(e?: any): any; // TEMP
    getGuildChannelUnreadState(e?: any, t?: any, n?: any, i?: any, r?: any): any; // TEMP
    getGuildUnreadsSentinel(e?: any): any; // TEMP
    getMentionChannelIds(): any; // TEMP
    getMentionCount(e?: any): any; // TEMP
    getNonChannelAckId(e?: any): any; // TEMP
    getNotifCenterReadState(e?: any): any; // TEMP
    getOldestUnreadMessageId(e?: any): any; // TEMP
    getOldestUnreadTimestamp(e?: any): any; // TEMP
    getReadStatesByChannel(): any; // TEMP
    getSnapshot(e?: any, t?: any): any; // TEMP
    getTrackedAckMessageId(e?: any): any; // TEMP
    getUnreadCount(e?: any): any; // TEMP
    hasOpenedThread(e?: any): any; // TEMP
    hasRecentlyVisitedAndRead(e?: any): any; // TEMP
    hasTrackedUnread(e?: any): any; // TEMP
    hasUnread(e?: any): any; // TEMP
    hasUnreadPins(e?: any): any; // TEMP
    isEstimated(e?: any): any; // TEMP
    isForumPostUnread(e?: any): any; // TEMP
    isNewForumThread(e?: any, t?: any, n?: any): any; // TEMP
    lastMessageId(e?: any): any; // TEMP
    lastMessageTimestamp(e?: any): any; // TEMP
    lastPinTimestamp(e?: any): any; // TEMP
}
