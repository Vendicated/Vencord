import { FluxStore } from "..";

export interface ChannelMemberCount {
    online: number | null;
    total: number | null;
}

export class ChannelMemberCountStore extends FluxStore {
    /** keyed by channel id */
    getState(): Record<string, ChannelMemberCount>;
    getMemberCount(channelId: string): ChannelMemberCount;
    requestCount(guildId: string, channelId: string): void;
}
