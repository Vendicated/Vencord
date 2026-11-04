import { FluxStore } from "..";

export type ChannelSection = "SEARCH" | "SIDEBAR_CHAT" | "FRIENDS" | "PROFILE" | "SUMMARIES" | "MEMBERS" | "CONVERSATIONS" | "NONE";

export class ChannelSectionStore extends FluxStore {
    getSection(channelId: string, isProfile?: boolean): ChannelSection;
    isFriendsSidebarAvailable(): boolean;
    getCurrentSidebarChannelId(channelId: string): string | null;
    getCurrentSidebarMessageId(channelId: string): string | null | undefined;
    getCurrentSearchContextId(): string | null;
    getGuildSidebarState(guildId?: string): unknown;
    getSidebarState(channelId?: string): unknown;
}
