import { FluxStore } from "..";

export interface ThreadMemberListSection {
    sectionId: string;
    userIds: string[];
}

export class ThreadMemberListStore extends FluxStore {
    getMemberListSections(channelId?: string): Record<string, ThreadMemberListSection>;
    getMemberListVersion(channelId: string): number | undefined;
    isMember(channelId: string, userId: string): boolean | null;
    canUserViewChannel(channelId: string, sectionId: string, userId: string): boolean;
}
