import { Channel, FluxStore } from "..";

/** Debug info for channel store state. */
export interface ChannelStoreDebugInfo {
    /** Guild IDs that have been loaded. */
    loadedGuildIds: string[];
    /** Guild IDs currently being loaded. */
    pendingGuildLoads: string[];
    /** String descriptions of guild channel counts. */
    guildSizes: string[];
}

/**
 * Flux store managing all channel data including guild channels,
 * threads, DMs, and group DMs.
 */
export class ChannelStore extends FluxStore {
    /**
     * Gets a channel by ID.
     * @param channelId Channel ID to look up.
     */
    getChannel(channelId: string): Channel;
    /**
     * Gets basic channel info by ID, returns undefined if not found.
     * @param channelId Channel ID to look up.
     */
    getBasicChannel(channelId: string): Channel | undefined;
    /**
     * Checks if a channel exists in the store.
     * @param channelId Channel ID to check.
     */
    hasChannel(channelId: string): boolean;

    /**
     * Gets all channel IDs, optionally filtered by guild.
     * @param guildId Guild ID to filter by, or null/undefined for all channels.
     */
    getChannelIds(guildId?: string | null): string[];
    /**
     * Gets basic guild channels as a mutable record.
     * @param guildId Guild ID to get channels for.
     * @returns Record keyed by channel ID.
     */
    getMutableBasicGuildChannelsForGuild(guildId: string): Record<string, Channel>;
    /**
     * Gets all guild channels as a mutable record.
     * @param guildId Guild ID to get channels for.
     * @returns Record keyed by channel ID.
     */
    getMutableGuildChannelsForGuild(guildId: string): Record<string, Channel>;
    /**
     * Gets all threads for a guild.
     * @param guildId Guild ID to get threads for.
     */
    getAllThreadsForGuild(guildId: string): Channel[];
    /**
     * Gets all threads under a parent channel.
     * @param parentChannelId Parent channel ID.
     */
    getAllThreadsForParent(parentChannelId: string): Channel[];
    /**
     * Gets sorted linked channels for a guild, such as stage instances and events.
     * @param guildId Guild ID.
     */
    getSortedLinkedChannelsForGuild(guildId: string): Channel[];

    /**
     * Gets DM channel ID for a user.
     * @param userId User ID to get DM for.
     * @returns Channel ID, not the channel object.
     */
    getDMFromUserId(userId: string): string | undefined;
    /**
     * Gets DM channel object for a user.
     * @param userId User ID to get DM for.
     */
    getDMChannelFromUserId(userId: string): Channel | undefined;
    /** Gets all user IDs that have DM channels. */
    getDMUserIds(): string[];
    /**
     * Gets mutable map of user ID to DM channel ID.
     * @returns Record keyed by user ID.
     */
    getMutableDMsByUserIds(): Record<string, string>;
    /**
     * Gets mutable map of all private channels.
     * @returns Record keyed by channel ID.
     */
    getMutablePrivateChannels(): Record<string, Channel>;
    /** Gets private channels sorted by last message. */
    getSortedPrivateChannels(): Channel[];

    /**
     * Gets version number for guild channels, incremented on changes.
     * @param guildId Guild ID.
     */
    getGuildChannelsVersion(guildId: string): number;
    /** Gets version number for private channels, incremented on changes. */
    getPrivateChannelsVersion(): number;
    /**
     * Gets initial channel state for overlay rendering.
     * @returns Record keyed by channel ID.
     */
    getInitialOverlayState(): Record<string, Channel>;

    /** Gets debug info about store state. */
    getDebugInfo(): ChannelStoreDebugInfo;

    /** Loads all guild and private channels from disk cache. */
    loadAllGuildAndPrivateChannelsFromDisk(): Promise<void>;
}
