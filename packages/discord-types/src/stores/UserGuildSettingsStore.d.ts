import { ChannelOverrideFlags, GuildSettingsFlags, NotifyHighlights, UserNotificationSetting } from "../../enums";
import { Channel, FluxStore, Guild } from "..";

export interface MuteConfig {
    selected_time_window: number | null;
    end_time: string | null;
}

export interface ChannelOverride {
    muted: boolean;
    mute_config: MuteConfig | null;
    message_notifications: UserNotificationSetting;
    flags?: ChannelOverrideFlags;
    collapsed: boolean;
    channel_id: string;
}

export interface GuildSettings {
    suppress_everyone: boolean;
    suppress_roles: boolean;
    mute_scheduled_events: boolean;
    mobile_push: boolean;
    muted: boolean;
    message_notifications: UserNotificationSetting;
    flags: GuildSettingsFlags;
    channel_overrides: Record<string, ChannelOverride>;
    notify_highlights: NotifyHighlights;
    hide_muted_channels: boolean;
    version: number;
    mute_config: MuteConfig | null;
    guild_id: string;
}

export interface AccountNotificationSettings {
    flags: number;
}

export interface UserGuildSettingsState {
    useNewNotifications: boolean;
}

export class UserGuildSettingsStore extends FluxStore {
    get accountNotificationSettings(): AccountNotificationSettings;
    get mentionOnAllMessages(): boolean;
    get useNewNotifications(): boolean;

    allowAllMessages(channel: Channel): boolean;
    allowNoMessages(channel: Channel): boolean;
    // TODO: finish typing
    getAllSettings(): { userGuildSettings: Record<string, GuildSettings>; };
    getChannelFlags(channel: Channel): ChannelOverrideFlags;
    getChannelIdFlags(guildId: string | null, channelId: string): ChannelOverrideFlags;
    getChannelMessageNotifications(guildId: string | null, channelId: string): UserNotificationSetting;
    getChannelMuteConfig(guildId: string | null, channelId: string): MuteConfig | null;
    getChannelOverrides(guildId: string | null): Record<string, ChannelOverride>;
    getChannelRecordUnreadSetting(channel: Channel): number;
    getChannelUnreadSetting(guildId: string | null, channelId: string): number;
    getGuildFavorites(guildId: string): string[];
    getGuildFlags(guildId: string): GuildSettingsFlags;
    getGuildUnreadSetting(guildId: string): number;
    getMessageNotifications(guildId: string): UserNotificationSetting;
    getMuteConfig(guildId: string): MuteConfig | null;
    getMutedChannels(guildId: string | null): Set<string>;
    getNewForumThreadsCreated(channel: Channel): boolean;
    getNotifyHighlights(guildId: string): NotifyHighlights;
    getOptedInChannels(guildId: string): Set<string>;
    // TODO: finish typing these
    getOptedInChannelsWithPendingUpdates(guildId: string): Set<string> | undefined;
    getPendingChannelUpdates(guildId: string): Record<string, any>;
    getState(): UserGuildSettingsState;
    isCategoryMuted(guildId: string, channelId: string): boolean;
    isChannelMuted(guildId: string | null, channelId: string): boolean;
    isChannelOptedIn(guildId: string, channelId: string, usePending?: boolean): boolean;
    isChannelOrParentOptedIn(guildId: string, channelId: string, usePending?: boolean): boolean;
    isChannelRecordOrParentOptedIn(channel: Channel, usePending?: boolean): boolean;
    isFavorite(guildId: string, channelId: string): boolean;
    isGuildCollapsed(guildId: string): boolean;
    isGuildOrCategoryOrChannelMuted(guildId: string | null, channelId: string): boolean;
    isMessagesFavorite(channelId: string): boolean;
    isMobilePushEnabled(guildId: string): boolean;
    isMuteScheduledEventsEnabled(guildId: string): boolean;
    isMuted(guildId: string): boolean;
    isOptInEnabled(guildId: string): boolean;
    isSuppressEveryoneEnabled(guildId: string): boolean;
    isSuppressRolesEnabled(guildId: string): boolean;
    isTemporarilyMuted(guildId: string): boolean;
    resolveGuildUnreadSetting(guild: Guild): number;
    resolveUnreadSetting(channel: Channel): number;
    resolvedMessageNotifications(channel: Channel): UserNotificationSetting;
}
