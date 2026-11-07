import { FluxStore } from "..";

export interface ThreadMembersInfo {
    guildId: string;
    parentId: string;
    memberCount: number;
    memberIdsPreview: string[];
}

export class ThreadMembersStore extends FluxStore {
    getMemberCount(channelId: string): number | null;
    getMemberIdsPreview(channelId: string): string[] | null;
    /** keyed by thread id */
    getInitialOverlayState(): Record<string, ThreadMembersInfo>;
}
