import { FluxStore, Message, MessageJSON } from "..";

export interface ThreadMessageInfo {
    guildId: string;
    parentId: string;
    count: number;
    mostRecentRawMessage: MessageJSON | null;
    mostRecentMessage: Message | null;
}

export class ThreadMessageStore extends FluxStore {
    getCount(channelId: string): number | null;
    getMostRecentMessage(channelId: string): Message | null;
    getChannelThreadsVersion(parentChannelId: string): number | undefined;
    /** keyed by thread id */
    getInitialOverlayState(): Record<string, ThreadMessageInfo>;
}
