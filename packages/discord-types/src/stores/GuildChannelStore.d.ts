import { LiteralStringUnion } from "type-fest/source/literal-union";
import { FluxStore, Channel } from "..";

// for completion
type GuildId = LiteralStringUnion<"@favorites">;

export interface ComparableChannel {
    /**
     * >=0
     * only -1 for the uncatagorized category
     */
    comparator: number;
    channel: Channel;
}

export interface GuildChannels {
    id: string;
    /**
     * Enum value. Corresponds to `GUILD_CATEGORY`
     *
     * Will always have an uncategorized category.
     * This is a channel with the id of **THE STRING** null, the name "Uncategorized", and a comparator of -1.
     * It does not count toward the {@link count}
     */
    4: ComparableChannel[];
    SELECTABLE: ComparableChannel[];
    VOCAL: ComparableChannel[];
    count: number;
}

interface ChannelNameDisambiguation {
    /**
     * channel id
     */
    [key: string]: {
        name: string;
        /**
         * channel id
         */
        id: string;
    };
}

type ComparableChannelPredicate = (channel: ComparableChannel) => boolean;

export class GuildChannelStore extends FluxStore {
    getAllGuilds(): Record<GuildId, GuildChannels>;
    /**
     * If the guild is not found, returns an object like below
     * ```ts
     * {
     *     id: "<the id you passed in>",
     *     "4": ["<Uncategorized Category>"],
     *     SELECTABLE: [],
     *     VOCAL: [],
     *     count: 0
     * }
     * ```
     */
    getChannels(guildId: GuildId): GuildChannels;
    /**
     * equivalent to the below code
     * ```ts
     * return getChannels(guildId)[channelType].find(predicate)?.channel ?? null;
     * ```
     *
     * @see {@link #getChannels}
     */
    getFirstChannelOfType(guildId: GuildId, predicate: ComparableChannelPredicate, channelType: keyof Omit<GuildChannels, "id" | "count">): Channel | null;
    /**
     * First searches {@link GuildChannels.SELECTABLE|Selectable} channels, then {@link GuildChannels.VOCAL|Voice} channels if (no selectable channels were found and {@link searchVoiceChannels} is true)
     *
     * @param searchVoiceChannels defaults to false
     */
    getFirstChannel(guildId: GuildId, predicate: ComparableChannelPredicate, searchVoiceChannels?: boolean): Channel | null;
    /**
     * Gets the first channel that has the given permission
     *
     * @param searchVoiceChannels defaults to false
     * @param permission defaults to VIEW_CHANNEL
     *
     * @see {@link getFirstChannel}
     */
    getDefaultChannel(guildId: GuildId, searchVoiceChannels?: boolean, permission?: bigint): Channel | null;
    /**
     * the same as {@link getDefaultChannel} but only returns SFW channels
     *
     * @see {@link getDefaultChannel}
     */
    getSFWDefaultChannel(guildId: GuildId, searchVoiceChannels?: boolean, permission?: bigint): Channel | null;
    getSelectableChannelIds(guildId: GuildId): string[];
    getSelectableChannels(guildId: GuildId): ComparableChannel[];
    getVocalChannelIds(guildId: GuildId): string[];
    getDirectoryChannelIds(guildId: GuildId): string[];
    /**
     * the same as the below code
     * ```ts
     * getSelectableChannels(guildId).includes(channelId)
     * ```
     */
    hasSelectableChannel(guildId: GuildId, channelId: string): boolean;
    hasElevatedPermissions(guildId: GuildId): boolean;
    hasChannels(guildId: GuildId): boolean;
    hasCategories(guildId: GuildId): boolean;
    /**
     * returns `{}` if no guild is found
     */
    getTextChannelNameDisambiguation(guildId: GuildId): ChannelNameDisambiguation;
}
