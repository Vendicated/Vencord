import { FluxStore, MuteConfig } from "..";

export interface JoinedThread {
    threadId: string;
    guildId: string;
    flags: number;
    muted: boolean;
    muteConfig: MuteConfig | null;
    joinTimestamp: Date;
}

export class JoinedThreadsStore extends FluxStore {
    hasJoined(channelId: string): boolean;
    joinTimestamp(channelId: string): Date | undefined;
    flags(channelId: string): number | undefined;
    getInitialOverlayState(): JoinedThread[];
    getMuteConfig(channelId: string): MuteConfig | null | undefined;
    getMutedThreads(): Set<string>;
    isMuted(channelId: string): boolean;
}
