import { Channel, FluxStore, Guild } from "..";

export const enum MessageNotifications {
    ALL_MESSAGES = 0,
    ONLY_MENTIONS = 1,
    NO_MESSAGES = 2,
    NULL = 3
}

export interface MuteConfig {
    /** An ISO timestamp string of when the mute will end */
    end_time: string;
    /** The length of the initial mute, in seconds */
    selected_time_window: number;
}

export interface ChannelSettings {
    channel_id: string;
    collapsed: boolean;
    message_notifications: MessageNotifications;
    mute_config: MuteConfig | undefined;
    muted: boolean;
}

export const enum NotifyHighlights {
    NULL = 0,
    DISABLED = 1,
    ENABLED = 2
}

export const enum ChannelFlags {
    NEW_FORUM_THREADS_ON = 16384,
    NEW_FORUM_THREADS_OFF = 8192,
    OPT_IN_ENABLED = 4096,
    FAVORITED = 2048,
    UNREADS_ALL_MESSAGES = 1024,
    UNREADS_ONLY_MENTIONS = 512
}

export const enum GuildFlags {
    OPT_IN_CHANNELS_ON = 16384,
    OPT_IN_CHANNELS_OFF = 8192,
    UNREADS_ONLY_MENTIONS = 4096,
    UNREADS_ALL_MESSAGES = 2048
}

export const enum UnreadSetting {
    UNSET = 0,
    ALL_MESSAGES = 1,
    ONLY_MENTIONS = 2
}

export interface GuildSettings {
    /** Private channels are under the string key `"null"` */
    channel_overrides: Record<string, ChannelSettings>;
    flags: GuildFlags;
    hide_muted_channels: boolean;
    message_notifications: MessageNotifications;
    mobile_push: boolean;
    mute_config: MuteConfig | undefined;
    mute_scheduled_events: boolean;
    muted: boolean;
    notify_highlights: NotifyHighlights;
    suppress_everyone: boolean;
    suppress_roles: boolean;
    version: 0;
}

export interface UserGuildSettings {
    userGuildSettings: Record<string, GuildSettings>;
    mutedChannels: Set<string>;
    optedInChannelsByGuild: Record<string, Set<string>>;
}

export const enum AccountFlags {
    USE_NEW_NOTIFICATIONS = 16,
    MENTION_ON_ALL_MESSAGES = 32
}

export class UserGuildSettingsStore extends FluxStore {
    /** Returns whether account-wide new notifications are enabled */
    getState(): { useNewNotifications: boolean };
    /** Returns whether account-wide mentions on all messages are enabled */
    get mentionOnAllMessages(): boolean;
    /** Returns whether "Suppress @everyone and @here" is enabled for the given guild ID */
    isSuppressEveryoneEnabled(guildId: string): boolean;
    /** Returns whether "Suppress @role mentions" is enabled for the given guild ID */
    isSuppressRolesEnabled(guildId: string): boolean;
    /** Returns whether "Mute New Events" is enabled for the given guild ID */
    isMuteScheduledEventsEnabled(guildId: string): boolean;
    /** Returns whether "Mobile Push Notifications" is enabled for the given guild ID */
    isMobilePushEnabled(guildId: string): boolean;
    /** Returns whether the given guild ID is currently muted */
    isMuted(guildId: string): boolean;
    /** Returns whether the given guild ID is currently muted and the mute will expire */
    isTemporarilyMuted(guildId: string): boolean;
    /** Returns the mute config for the given guild ID */
    getMuteConfig(guildId: string): MuteConfig | undefined;
    /** Returns the message notifications setting for the given guild ID */
    getMessageNotifications(guildId: string): MessageNotifications;
    /** Returns a record of channel overrides for the given guild ID */
    getChannelOverrides(guildId: string | null): Record<string, ChannelSettings>;
    /** Returns the notify highlights setting for the given guild ID */
    getNotifyHighlights(guildId: string): NotifyHighlights;
    /** Returns the guild flags for the given guild ID */
    getGuildFlags(guildId: string): GuildFlags;
    /** Returns the message notifications setting for the given channel ID in the given guild ID */
    getChannelMessageNotifications(guildId: string, channelId: string): MessageNotifications;
    /** Returns the mute config for the given channeld ID in the given guild ID */
    getChannelMuteConfig(guildId: string | null, channelId: string): MuteConfig | null;
    /** Returns a set of muted channel IDs in the given guild ID */
    getMutedChannels(guildId: string | null): Set<string>;
    /** Returns whether the given channel ID in the given guild ID is muted */
    isChannelMuted(guildId: string | null, channelId: string): boolean;
    /** Returns whether the given channel ID in the given guild ID is in a muted category */
    isCategoryMuted(guildId: string, channelId: string): boolean;
    /** Returns a resolved (inheriting from the containing guild and its default) message notifications setting for the given channel */
    resolvedMessageNotifications(channel: Channel): MessageNotifications;
    /** Returns a resolved (inheriting from the containing guild and its default) unread setting for the given channel */
    resolveUnreadSetting(channel: Channel): UnreadSetting;
    /** Returns whether the given channel ID, its category, or the given guild ID is muted */
    isGuildOrCategoryOrChannelMuted(guildId: string | null, channelId: string): boolean;
    /** Returns whether no messages in the given channel should give notifications */
    allowNoMessages(channel: Channel): boolean;
    /** Returns whether all messages in the given channel should give notifications */
    allowAllMessages(channel: Channel): boolean;
    /** Returns whether muted channels are hidden in the given guild ID */
    isGuildCollapsed(guildId: string): boolean;
    /** Returns all user and guild notification settings */
    getAllSettings(): UserGuildSettings;
    /** Returns the channel flags for the given channel ID in the given guild ID */
    getChannelIdFlags(guildId: string | null, channelId: string): ChannelFlags;
    /** Returns the channel flags for the given channel */
    getChannelFlags(channel: Channel): ChannelFlags;
    /** Returns whether new forum threads in the given channel give notifications */
    getNewForumThreadsCreated(channel: Channel): boolean;
    /** Returns whether a given server uses opt-in notifications */
    isOptInEnabled(guildId: string): boolean;
    /** Returns whether the given channel or its category has been opted into notifications */
    isChannelRecordOrParentOptedIn(channel: Channel): boolean;
    /** Returns whether the given channel ID or category has been opted into notifications */
    isChannelOrParentOptedIn(guildId: string, channelId: string): boolean;
    /** Returns whether the given channel ID has been opted into notifications */
    isChannelOptedIn(guildId: string, channelId: string): boolean;
    /** Returns a set of channels in the given guild ID that have been opted into notifications */
    getOptedInChannels(guildId: string): Set<string>;
    /** Returns a set of channels in the given guild ID that have been opted into notifications, including pending updates */
    getOptedInChannelsWithPendingUpdates(guildId: string | null): string[] | undefined;
    /** Returns a list of pending channel updates in the given guild ID */
    getPendingChannelUpdates(guildId: string | null): string[] | undefined;
    /** Returns a list of favorited channel IDs in the given guild ID */
    getGuildFavorites(guildId: string): string[];
    /** Returns whether the given channel ID is favorited in the given guild ID */
    isFavorite(guildId: string, channelId: string): boolean;
    /** Returns whether the given private channel ID is favorited */
    isMessagesFavorite(channelId: string): boolean;
    /** Returns whether the given private channel ID has been opted into notifications */
    isAddedToMessages(channelId: string): boolean;
    /** Returns a set of private channels that have been opted into notifications */
    getAddedToMessages(): Set<string>;
    /** Returns account-wide notification settings */
    get accountNotificationSettings(): { flags: AccountFlags };
    /** Returns whether the account-wide new notifications have been enabled */
    get useNewNotifications(): boolean;
    /** Returns the unread setting for the given guild ID */
    getGuildUnreadSetting(guildId: string): UnreadSetting;
    /** Returns a resolved (inheriting from the default) unread setting for the given guild ID */
    resolveGuildUnreadSetting(guildId: string): UnreadSetting;
    /** Returns a resolved (inheriting from the containing guild and its default) unread setting for the given channel */
    getChannelRecordUnreadSetting(channel: Channel): UnreadSetting;
    /** Returns a resolved (inheriting from the containing guild ID and its default) unread setting for the given channel ID */
    getChannelUnreadSetting(guildId: string | null, channelId: string): UnreadSetting;
}
