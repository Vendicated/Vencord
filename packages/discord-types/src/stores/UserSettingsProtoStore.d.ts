import { FluxStore } from "..";

export interface GuildFolder {
    guildIds: string[];
    folderId?: number;
    folderName?: string;
    folderColor?: number;
}

export interface GuildProto {
    channels: Record<string, unknown>;
    hubProgress: number;
    guildOnboardingProgress: number;
    dismissedGuildContent: Record<string, number>;
    disableRaidAlertPush: boolean;
    disableRaidAlertNag: boolean;
    leaderboardsDisabled: boolean;
    guildDismissibleContentStates: Record<string, unknown>;
}

export interface UserSettingsVersions {
    clientVersion: number;
    serverVersion: number;
    dataVersion: number;
}

export interface InboxSettings {
    currentTab: number;
    viewedTutorial: boolean;
}

export interface GuildsSettings {
    guilds: Record<string, GuildProto>;
}

export interface UserContentSettings {
    dismissedContents: string;
    lastReceivedChangelogId: string;
    recurringDismissibleContentStates: Record<string, unknown>;
    lastDismissedOutboundPromotionStartDate: unknown;
    premiumTier0ModalDismissedAt: unknown;
}

export interface VoiceAndVideoSettings {
    videoBackgroundFilterDesktop: unknown;
    alwaysPreviewVideo: boolean;
    afkTimeout: number;
    streamNotificationsEnabled: boolean;
    nativePhoneIntegrationEnabled: boolean;
    disableStreamPreviews: boolean;
    soundmojiVolume: number;
}

export interface TextAndImagesSettings {
    emojiPickerCollapsedSections: string[];
    stickerPickerCollapsedSections: string[];
    soundboardPickerCollapsedSections: string[];
    dmSpamFilterV2: number;
    viewImageDescriptions: boolean;
    inlineAttachmentMedia: boolean;
    inlineEmbedMedia: boolean;
    gifAutoPlay: boolean;
    renderEmbeds: boolean;
    renderReactions: boolean;
    animateEmoji: boolean;
    animateStickers: number;
    enableTtsCommand: boolean;
    messageDisplayCompact: boolean;
    explicitContentFilter: number;
    viewNsfwGuilds: boolean;
    convertEmoticons: boolean;
    viewNsfwCommands: boolean;
    includeStickersInAutocomplete: boolean;
    explicitContentSettings: unknown;
    goreContentSettings: unknown;
    showMentionSuggestions: boolean;
}

export interface NotificationsSettings {
    notificationCenterAckedBeforeId: string;
    focusModeExpiresAtMs: string;
    reactionNotifications: number;
    gameActivityNotifications: boolean;
    customStatusPushNotifications: boolean;
    showInAppNotifications: boolean;
    notifyFriendsOnGoLive: boolean;
    enableVoiceActivityNotifications: boolean;
    enableUserResurrectionNotifications: boolean;
}

export interface PrivacySettings {
    restrictedGuildIds: string[];
    defaultGuildsRestricted: boolean;
    allowAccessibilityDetection: boolean;
    activityRestrictedGuildIds: string[];
    defaultGuildsActivityRestricted: boolean;
    activityJoiningRestrictedGuildIds: string[];
    messageRequestRestrictedGuildIds: string[];
    guildsLeaderboardOptOutDefault: boolean;
    slayerSdkReceiveDmsInGame: boolean;
    defaultGuildsActivityRestrictedV2: boolean;
    detectPlatformAccounts: boolean;
    passwordless: boolean;
    contactSyncEnabled: boolean;
    friendSourceFlags: number;
    friendDiscoveryFlags: number;
    dropsOptedOut: boolean;
    hideLegacyUsername: boolean;
    defaultGuildsRestrictedV2: boolean;
    quests3PDataOptedOut: boolean;
}

export interface GameLibrarySettings {
    disableGamesTab: boolean;
}

export interface StatusSettings {
    statusExpiresAtMs: string;
    status: { status: string } | null;
    showCurrentGame: boolean;
    statusCreatedAtMs: string;
}

export interface LocalizationSettings {
    locale: { localeCode: string } | null;
    timezoneOffset: { offset: number } | null;
}

export interface AppearanceSettings {
    theme: number;
    developerMode: boolean;
    mobileRedesignDisabled: boolean;
    timestampHourCycle: number;
    launchPadMode: number;
    uiDensity: number;
    swipeRightToLeftMode: number;
    clientThemeSettings: unknown;
}

export interface GuildFoldersSettings {
    folders: GuildFolder[];
    guildPositions: string[];
}

export interface AudioContextSettings {
    user: Record<string, unknown>;
    stream: Record<string, unknown>;
}

export interface ClipsSettings {
    allowVoiceRecording: boolean;
}

export interface InAppFeedbackSettings {
    inAppFeedbackStates: Record<string, unknown>;
}

export interface UserSettings {
    versions: UserSettingsVersions;
    inbox: InboxSettings;
    guilds: GuildsSettings;
    userContent: UserContentSettings;
    voiceAndVideo: VoiceAndVideoSettings;
    textAndImages: TextAndImagesSettings;
    notifications: NotificationsSettings;
    privacy: PrivacySettings;
    debug: Record<string, unknown>;
    gameLibrary: GameLibrarySettings;
    status: StatusSettings;
    localization: LocalizationSettings;
    appearance: AppearanceSettings;
    guildFolders: GuildFoldersSettings;
    audioContextSettings: AudioContextSettings;
    clips: ClipsSettings;
    inAppFeedbackSettings: InAppFeedbackSettings;
}

export interface FrecencySettings {
    versions: unknown;
    favoriteGifs: unknown;
    favoriteStickers: unknown;
    stickerFrecency: unknown;
    favoriteEmojis: unknown;
    emojiFrecency: unknown;
    applicationCommandFrecency: unknown;
    favoriteSoundboardSounds: unknown;
    applicationFrecency: unknown;
    playedSoundFrecency: unknown;
    guildAndChannelFrecency: unknown;
    emojiReactionFrecency: unknown;
}

export interface ProtoState {
    proto: unknown;
}

export class UserSettingsProtoStore extends FluxStore {
    settings: UserSettings;
    frecencyWithoutFetchingLatest: FrecencySettings;
    wasMostRecentUpdateFromServer: boolean;
    getState(): Record<string, ProtoState>;
    computeState(): Record<string, ProtoState>;
    getFullState(): Record<string, ProtoState>;
    hasLoaded(settingsType: number): boolean;
    getGuildFolders(): GuildFolder[];
    getGuildRecentsDismissedAt(guildId: string): number;
    getDismissedGuildContent(guildId: string): Record<string, number> | null;
    getGuildDismissedContentState(guildId: string): unknown;
    getGuildsProto(): Record<string, GuildProto>;
}
