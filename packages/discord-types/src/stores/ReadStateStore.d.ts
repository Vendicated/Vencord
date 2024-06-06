/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { GuildChannelRecord } from "../general/channels/ChannelRecord";
import type { GuildRecord } from "../general/GuildRecord";
import type { ChannelIdReadStateType, GuildChannelOverride, GuildIdReadStateType, ReadState, ReadStateSnapshot, ReadStateType, SerializedReadState, UserIdReadStateType } from "../general/ReadState";
import type { Nullish } from "../internal";
import type { FluxStore } from "./abstract/FluxStore";
import type { BasicPermissionsObject } from "./PermissionStore";

export type ReadStateStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC_CHANNEL_MESSAGES" | "BULK_ACK" | "CACHE_LOADED" | "CHANNEL_ACK" | "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_LOCAL_ACK" | "CHANNEL_PINS_ACK" | "CHANNEL_PINS_UPDATE" | "CHANNEL_RTC_UPDATE_CHAT_OPEN" | "CHANNEL_SELECT" | "CLEAR_OLDEST_UNREAD_MESSAGE" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "CURRENT_USER_UPDATE" | "DECAY_READ_STATES" | "DISABLE_AUTOMATIC_ACK" | "DRAWER_CLOSE" | "DRAWER_OPEN" | "ENABLE_AUTOMATIC_ACK" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_FEATURE_ACK" | "GUILD_SCHEDULED_EVENT_CREATE" | "GUILD_SCHEDULED_EVENT_DELETE" | "GUILD_SCHEDULED_EVENT_UPDATE" | "GUILD_UPDATE" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_THREADS_SUCCESS" | "LOGOUT" | "MESSAGE_ACK" | "MESSAGE_CREATE" | "MESSAGE_DELETE" | "MESSAGE_DELETE_BULK" | "MESSAGE_REQUEST_ACK" | "MESSAGE_REQUEST_CLEAR_ACK" | "MOD_VIEW_SEARCH_FINISH" | "NOTIFICATION_CENTER_ITEMS_ACK" | "NOTIFICATION_CENTER_ITEM_CREATE" | "OVERLAY_INITIALIZE" | "PASSIVE_UPDATE_V2" | "RELATIONSHIP_ADD" | "RELATIONSHIP_REMOVE" | "RESORT_THREADS" | "SEARCH_FINISH" | "THREAD_CREATE" | "THREAD_DELETE" | "THREAD_LIST_SYNC" | "THREAD_MEMBERS_UPDATE" | "THREAD_MEMBER_UPDATE" | "THREAD_UPDATE" | "TRY_ACK" | "UPDATE_CHANNEL_DIMENSIONS" | "USER_NON_CHANNEL_ACK" | "VOICE_CHANNEL_SELECT" | "WINDOW_FOCUS">;

export class ReadStateStore<Action extends FluxAction = ReadStateStoreAction> extends FluxStore<Action> {
    static displayName: "ReadStateStore";

    ackMessageId(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): string | null;
    getAllReadStates<ForCache extends boolean>(forCache: ForCache): SerializedReadState<ForCache>;
    getForDebugging<Type extends ChannelIdReadStateType | undefined>(channelId: string, type?: Type): ReadState<ChannelIdReadStateType> | undefined;
    getForDebugging<Type extends UserIdReadStateType>(userId: string, type: Type): ReadState<Type> | undefined;
    getForDebugging<Type extends GuildIdReadStateType>(guildId: string, type: Type): ReadState<Type> | undefined;
    getGuildChannelUnreadState(
        guildChannel: BasicPermissionsObject | GuildChannelRecord,
        isOptInEnabled: boolean,
        guildChannelOverrides: { [channelId: string]: GuildChannelOverride; },
        isChannelMuted: boolean,
        isReadStateTypeUnread?: boolean | undefined
    ): {
        mentionCount: boolean;
        unread: boolean;
    };
    getGuildUnreadsSentinel(guildId: string): typeof ReadState["_guildReadStateSentinels"];
    getMentionChannelIds(): string[];
    getMentionCount(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): number;
    getNonChannelAckId(type: ReadStateType.NOTIFICATION_CENTER | ReadStateType.MESSAGE_REQUESTS): string | null;
    getNotifCenterReadState(userId: string): ReadState<ReadStateType.NOTIFICATION_CENTER>;
    getOldestUnreadMessageId(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): string | null;
    getOldestUnreadTimestamp(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): number;
    getReadStatesByChannel(): { [channelId: string]: ReadState<ReadStateType.CHANNEL>; };
    getSnapshot(id: string, snapshotTTL: number): ReadStateSnapshot;
    getTrackedAckMessageId(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): string | null;
    getUnreadCount(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): number;
    hasOpenedThread(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean;
    hasRecentlyVisitedAndRead(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean;
    hasTrackedUnread(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean;
    hasUnread(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean;
    hasUnreadPins(channelId: string): boolean;
    isEstimated(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean;
    isForumPostUnread(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean;
    isNewForumThread(forumThreadId: string, forumId: string, guild?: GuildRecord | Nullish): boolean;
    /**
     * Returns the ID of the last message in the channel associated with the specified ID.
     * @returns The ID of the channel's last message or null if no messages have ever been sent in the channel. If the channel has not been fetched, null is returned.
     */
    lastMessageId(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): string | null;
    /**
     * Returns the timestamp of the last message in the channel associated with the specified ID.
     * @returns The timestamp of the channel's last message or 0 if no messages have ever been sent in the channel. If the channel has not been fetched, 0 is returned.
     */
    lastMessageTimestamp(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): number;
    /**
     * Returns the timestamp of the last pin in the channel associated with the specified ID.
     * @returns The timestamp of the channel's last pin or 0 if the channel has no pins. If the channel has not been fetched, null is returned.
     */
    lastPinTimestamp(channelId: string): number | null;
}
