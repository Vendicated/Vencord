import { Channel, FluxStore } from "..";

export interface MuteConfig {
    selected_time_window: number;
    end_time: string | null;
}

export interface ChannelOverride {
    muted: boolean;
    mute_config: MuteConfig | null;
    message_notifications: number;
    flags: number;
    collapsed: boolean;
    channel_id: string;
}

export interface GuildSettings {
    suppress_everyone: boolean;
    suppress_roles: boolean;
    mute_scheduled_events: boolean;
    mobile_push: boolean;
    muted: boolean;
    message_notifications: number;
    flags: number;
    channel_overrides: Record<string, ChannelOverride>;
    notify_highlights: number;
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

    allowAllMessages(guildId: string): boolean;
    allowNoMessages(guildId: string): boolean;
    getAddedToMessages(): string[];
    // TODO: finish typing
    getAllSettings(): { userGuildSettings: Record<string, GuildSettings>; };
    getChannelFlags(channel: Channel): number;
    getChannelIdFlags(guildId: string, channelId: string): number;
    getChannelMessageNotifications(guildId: string, channelId: string): number | null;
    getChannelMuteConfig(guildId: string, channelId: string): MuteConfig | null;
    getChannelOverrides(guildId: string): Record<string, ChannelOverride>;
    getChannelRecordUnreadSetting(channel: Channel): number;
    getChannelUnreadSetting(guildId: string, channelId: string): number;
    getGuildFavorites(guildId: string): string[];
    getGuildFlags(guildId: string): number;
    getGuildUnreadSetting(guildId: string): number;
    getMessageNotifications(guildId: string): number;
    getMuteConfig(guildId: string): MuteConfig | null;
    getMutedChannels(guildId: string): string[];
    getNewForumThreadsCreated(guildId: string): boolean;
    getNotifyHighlights(guildId: string): number;
    getOptedInChannels(guildId: string): string[];
    // TODO: finish typing these
    getOptedInChannelsWithPendingUpdates(guildId: string): Record<string, any>;
    getPendingChannelUpdates(guildId: string): Record<string, any>;
    getState(): UserGuildSettingsState;
    isAddedToMessages(channelId: string): boolean;
    isCategoryMuted(guildId: string, channelId: string): boolean;
    isChannelMuted(guildId: string, channelId: string): boolean;
    isChannelOptedIn(guildId: string, channelId: string, usePending?: boolean): boolean;
    isChannelOrParentOptedIn(guildId: string, channelId: string, usePending?: boolean): boolean;
    isChannelRecordOrParentOptedIn(channel: Channel, usePending?: boolean): boolean;
    isFavorite(guildId: string, channelId: string): boolean;
    isGuildCollapsed(guildId: string): boolean;
    isGuildOrCategoryOrChannelMuted(guildId: string, channelId: string): boolean;
    isMessagesFavorite(guildId: string): boolean;
    isMobilePushEnabled(guildId: string): boolean;
    isMuteScheduledEventsEnabled(guildId: string): boolean;
    isMuted(guildId: string): boolean;
    isOptInEnabled(guildId: string): boolean;
    isSuppressEveryoneEnabled(guildId: string): boolean;
    isSuppressRolesEnabled(guildId: string): boolean;
    isTemporarilyMuted(guildId: string): boolean;
    resolveGuildUnreadSetting(guildId: string): number;
    resolveUnreadSetting(channel: Channel): number;
    resolvedMessageNotifications(guildId: string): number;
}
