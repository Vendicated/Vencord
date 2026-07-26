import { Channel, FluxStore, ThreadJoined } from "..";
import { ChannelType } from "../../enums";

export interface ChannelWithComparator {
    channel: Channel;
    comparator: number;
}

export interface GuildChannels {
    [ChannelType.GUILD_CATEGORY]: ChannelWithComparator[];
    id: string;
    SELECTABLE: ChannelWithComparator[] | ThreadJoined[];
    VOCAL: ChannelWithComparator[];
    count: number;
}

export interface ChannelNameDisambiguation {
    id: string;
    name: string;
}

export class GuildChannelStore extends FluxStore {
    getAllGuilds(): Record<string, GuildChannels>;
    getChannels(guildId: string): GuildChannels;
    getDefaultChannel(guildId: string): Channel | null;
    getDirectoryChannelIds(guildId: string): string[];
    getFirstChannel(
        guildId: string,
        predicate: (item: ChannelWithComparator) => boolean,
        includeVocal?: boolean
    ): Channel | null;
    getFirstChannelOfType(
        guildId: string,
        predicate: (item: ChannelWithComparator) => boolean,
        type: "SELECTABLE" | "VOCAL" | ChannelType.GUILD_CATEGORY
    ): Channel | null;
    getSFWDefaultChannel(guildId: string): Channel | null;
    getSelectableChannelIds(guildId: string): string[];
    getSelectableChannels(guildId: string): ChannelWithComparator[];
    getTextChannelNameDisambiguations(guildId: string): Record<string, ChannelNameDisambiguation>;
    getVocalChannelIds(guildId: string): string[];
    hasCategories(guildId: string): boolean;
    hasChannels(guildId: string): boolean;
    hasElevatedPermissions(guildId: string): boolean;
    hasSelectableChannel(guildId: string, channelId: string): boolean;
}
