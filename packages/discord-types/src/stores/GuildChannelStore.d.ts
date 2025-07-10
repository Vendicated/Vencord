import { FluxStore, Channel } from "..";

// for completion
type GuildId = "@favorites" | (string & Record<never, never>);

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
    getFirstChannelOfType(guildId: GuildId, predicate: (channel: ComparableChannel) => boolean, channelType: keyof Omit<GuildChannels, "id" | "count">): Channel | null;
}
