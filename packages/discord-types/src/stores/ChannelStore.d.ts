import { Channel, FluxStore } from "..";

// TODO: Update this
export class ChannelStore extends FluxStore {
    getAllThreadsForParent(channelId: string): Channel[];
    getChannel(channelId: string): Channel;
    getDMFromUserId(userId: string): string;
    getDMUserIds(): string[];
    getGuildChannelsVersion(guildId: string): number;
    getInitialOverlayState(): Record<string, Channel>;
    getMutableGuildAndPrivateChannels(): Record<string, Channel>;
    getMutableGuildChannels(): Record<string, Channel>;
    getMutableGuildChannelsByGuild(): Record<string, Record<string, Channel>>;
    getMutablePrivateChannels(): Record<string, Channel>;
    getPrivateChannelsVersion(): number;
    getSortedPrivateChannels(): Channel[];
    hasChannel(channelId: string): boolean;
    initialize(): void;
}
