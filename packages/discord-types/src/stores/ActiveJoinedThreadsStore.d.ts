import { Channel, FluxStore } from "..";

export interface ThreadJoined {
    channel: Channel;
    joinTimestamp: number;
}

export type ThreadsForParent = Record<string, ThreadJoined>;
export type ThreadsForGuild = Record<string, ThreadsForParent>;
export type AllActiveJoinedThreads = Record<string, ThreadsForGuild>;

export interface NewThreadCounts {
    [parentChannelId: string]: number;
}

export class ActiveJoinedThreadsStore extends FluxStore {
    computeAllActiveJoinedThreads(guildId?: string | null): Channel[];
    getActiveJoinedRelevantThreadsForGuild(guildId: string): ThreadsForGuild;
    getActiveJoinedRelevantThreadsForParent(guildId: string, parentChannelId: string): ThreadsForParent;
    getActiveJoinedThreadsForGuild(guildId: string): ThreadsForGuild;
    getActiveJoinedThreadsForParent(guildId: string, parentChannelId: string): ThreadsForParent;
    getActiveJoinedUnreadThreadsForGuild(guildId: string): ThreadsForGuild;
    getActiveJoinedUnreadThreadsForParent(guildId: string, parentChannelId: string): ThreadsForParent;
    getActiveThreadCount(guildId: string, parentChannelId: string): number;
    getActiveUnjoinedThreadsForGuild(guildId: string): ThreadsForGuild;
    getActiveUnjoinedThreadsForParent(guildId: string, parentChannelId: string): ThreadsForParent;
    getActiveUnjoinedUnreadThreadsForGuild(guildId: string): ThreadsForGuild;
    getActiveUnjoinedUnreadThreadsForParent(guildId: string, parentChannelId: string): ThreadsForParent;
    getAllActiveJoinedThreads(): AllActiveJoinedThreads;
    getNewThreadCount(guildId: string, parentChannelId: string): number;
    getNewThreadCountsForGuild(guildId: string): NewThreadCounts;
    hasActiveJoinedUnreadThreads(guildId: string, parentChannelId: string): boolean;
}
