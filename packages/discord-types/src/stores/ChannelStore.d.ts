import { Channel, FluxStore } from "..";

export class ChannelStore extends FluxStore {
    getChannel(channelId: string): Channel;
    getBasicChannel(channelId: string): Channel | undefined;
    hasChannel(channelId: string): boolean;

    getChannelIds(guildId?: string | null): string[];
    getMutableBasicGuildChannelsForGuild(guildId: string): Record<string, Channel>;
    getMutableGuildChannelsForGuild(guildId: string): Record<string, Channel>;
    getAllThreadsForGuild(guildId: string): Channel[];
    getAllThreadsForParent(channelId: string): Channel[];

    getDMFromUserId(userId: string): string;
    getDMChannelFromUserId(userId: string): Channel | undefined;
    getDMUserIds(): string[];
    getMutableDMsByUserIds(): Record<string, string>;
    getMutablePrivateChannels(): Record<string, Channel>;
    getSortedPrivateChannels(): Channel[];

    getGuildChannelsVersion(guildId: string): number;
    getPrivateChannelsVersion(): number;
    getInitialOverlayState(): Record<string, Channel>;
}
