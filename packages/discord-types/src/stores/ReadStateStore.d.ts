import { Channel, FluxStore } from "..";
import { ReadStateType } from "../../enums";

export interface GuildChannelUnreadState {
    mentionCount: number;
    unread: boolean;
    isMentionLowImportance: boolean;
}

export interface ReadStateSnapshot {
    unread: boolean;
    mentionCount: number;
    guildUnread: boolean | null;
    guildMentionCount: number | null;
    takenAt: number;
}

export interface SerializedReadState {
    channelId: string;
    type: ReadStateType;
    _guildId: string;
    _persisted: boolean;
    _lastMessageId: string;
    _lastMessageTimestamp: number;
    _ackMessageId: string;
    _ackMessageTimestamp: number;
    ackPinTimestamp: number;
    lastPinTimestamp: number;
    _mentionCount: number;
    flags: number;
    lastViewed: number;
}

export class ReadStateStore extends FluxStore {
    ackMessageId(channelId: string, type?: ReadStateType): string | null;
    getAllReadStates(includePrivate?: boolean): SerializedReadState[];
    getChannelIdsForWindowId(windowId: string): string[];
    getForDebugging(channelId: string): object | undefined;
    getGuildChannelUnreadState(
        channel: Channel,
        isOptInEnabled: boolean,
        guildHasActiveThreads: boolean,
        isChannelMuted: boolean,
        isGuildHome: boolean
    ): GuildChannelUnreadState;
    getGuildUnreadsSentinel(guildId: string): number;
    getIsMentionLowImportance(channelId: string, type?: ReadStateType): boolean;
    getMentionChannelIds(): string[];
    getMentionCount(channelId: string, type?: ReadStateType): number;
    getNonChannelAckId(type: ReadStateType): string | null;
    getNotifCenterReadState(channelId: string): object | undefined;
    getOldestUnreadMessageId(channelId: string, type?: ReadStateType): string | null;
    getOldestUnreadTimestamp(channelId: string, type?: ReadStateType): number;
    getReadStatesByChannel(): Record<string, object>;
    getSnapshot(channelId: string, maxAge: number): ReadStateSnapshot;
    getTrackedAckMessageId(channelId: string, type?: ReadStateType): string | null;
    getUnreadCount(channelId: string, type?: ReadStateType): number;
    hasOpenedThread(channelId: string): boolean;
    hasRecentlyVisitedAndRead(channelId: string): boolean;
    hasTrackedUnread(channelId: string): boolean;
    hasUnread(channelId: string, type?: ReadStateType): boolean;
    hasUnreadOrMentions(channelId: string, type?: ReadStateType): boolean;
    hasUnreadPins(channelId: string): boolean;
    isEstimated(channelId: string, type?: ReadStateType): boolean;
    isForumPostUnread(channelId: string): boolean;
    isNewForumThread(threadId: string, parentChannelId: string, guildId: string): boolean;
    lastMessageId(channelId: string, type?: ReadStateType): string | null;
    lastMessageTimestamp(channelId: string, type?: ReadStateType): number;
    lastPinTimestamp(channelId: string): number;
}
