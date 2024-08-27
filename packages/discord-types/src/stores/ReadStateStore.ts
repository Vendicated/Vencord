/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";
import type { GuildChannelRecord } from "../general/channels/ChannelRecord";
import type { GuildRecord } from "../general/GuildRecord";
import type { ChannelIdReadStateType, GuildChannelOverride, GuildIdReadStateType, ReadState, ReadStateSnapshot, ReadStateType, SerializedReadState, UserIdReadStateType } from "../general/ReadState";
import type { Nullish } from "../internal";
import type { BasicPermissionsObject } from "./PermissionStore";

export declare class ReadStateStore extends Store {
    static displayName: "ReadStateStore";

    ackMessageId(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): string | null;
    getAllReadStates<ForCache extends boolean>(forCache: ForCache): SerializedReadState<ForCache>;
    getForDebugging(channelId: string, type?: ChannelIdReadStateType | undefined): ReadState<ChannelIdReadStateType> | undefined;
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
    /**
     * @param meId The user ID of the current user.
     * @returns The ReadState object for the inbox of the current user. If the current user has not yet been loaded, undefined is returned.
     */
    getNotifCenterReadState(meId: string): ReadState<ReadStateType.NOTIFICATION_CENTER> | undefined;
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
    hasUnreadOrMentions(id: string, type?: ReadStateType | undefined /* = ReadStateType.CHANNEL */): boolean;
    hasUnreadPins(channelId: string): boolean;
    initialize(): void;
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
