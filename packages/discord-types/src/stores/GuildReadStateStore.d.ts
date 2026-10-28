import { Channel, FluxStore } from "..";
import { ReadStateType } from "../../enums";

export interface GuildChannelMentionCount {
    count: number;
    isMentionLowImportance: boolean;
}

export interface GuildReadState {
    unread: boolean;
    unreadByType: Partial<Record<ReadStateType, boolean>>;
    unreadChannelId: string | null;
    lowImportanceMentionCount: number;
    highImportanceMentionCount: number;
    mentionCounts: Record<string, GuildChannelMentionCount>;
    ncMentionCount: number;
    sentinel: number;
}

export class GuildReadStateStore extends FluxStore {
    getGuildChangeSentinel(guildId: string | null): number;
    getGuildHasUnreadIgnoreMuted(guildId: string): boolean;
    getHighImportanceMentionCountForChannel(guildId: string | null, channelId: string): number;
    getIsMentionLowImportance(guildId: string | null): boolean;
    getMentionCount(guildId: string | null): number;
    getMentionCountForPrivateChannel(channelId: string): GuildChannelMentionCount | number;
    getMutableGuildStates(): Record<string, GuildReadState>;
    getMutableUnreadGuilds(): Set<string>;
    getPrivateChannelMentionCount(): number;
    getStoreChangeSentinel(): number;
    getTotalMentionCount(excludePrivateChannels?: boolean): number;
    getTotalNotificationsMentionCount(excludePrivateChannels?: boolean): number;
    hasAnyUnread(): boolean;
    hasUnread(guildId: string): boolean;
    shouldCountChannelUnread(channel: Channel, mentionCount?: number): boolean;
}
