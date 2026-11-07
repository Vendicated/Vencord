import { FluxStore } from "..";

export interface ActiveThread {
    id: string;
    parentId: string;
}

/** keyed by thread id */
export type ActiveThreadsForParent = Record<string, ActiveThread>;
/** keyed by parent channel id */
export type ActiveThreadsForGuild = Record<string, ActiveThreadsForParent>;

export class ActiveThreadsStore extends FluxStore {
    isActive(guildId: string | null | undefined, parentChannelId: string, threadId: string): boolean;
    getThreadsForGuild(guildId: string): ActiveThreadsForGuild;
    getThreadsForParent(guildId: string, parentChannelId: string): ActiveThreadsForParent;
    hasThreadsForChannel(guildId: string, parentChannelId: string): boolean;
    forEachGuild(callback: (guildId: string, threads: ActiveThreadsForGuild) => void): void;
    hasLoaded(guildId: string): boolean;
}
