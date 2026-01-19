import { FluxStore } from "..";

export interface GuildFolder {
    guildIds: string[];
    folderId?: number;
    folderName?: string;
    folderColor?: number;
}

export interface GuildProto {
    // TODO: finish typing
    channels: Record<string, any>;
    hubProgress: number;
    guildOnboardingProgress: number;
    dismissedGuildContent: Record<string, number>;
    disableRaidAlertPush: boolean;
    disableRaidAlertNag: boolean;
    leaderboardsDisabled: boolean;
    // TODO: finish typing
    guildDismissibleContentStates: Record<string, any>;
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
    // TODO: finish typing
    recurringDismissibleContentStates: Record<string, any>;
    // TODO: type
    lastDismissedOutboundPromotionStartDate: any;
    premiumTier0ModalDismissedAt: any;
}

export interface VoiceAndVideoSettings {
    // TODO: type
    videoBackgroundFilterDesktop: any;
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
    // TODO: type these
    explicitContentSettings: any;
    goreContentSettings: any;
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
    status: { status: string; } | null;
    showCurrentGame: boolean;
    statusCreatedAtMs: string;
}

export interface LocalizationSettings {
    locale: { localeCode: string; } | null;
    timezoneOffset: { offset: number; } | null;
}

export interface AppearanceSettings {
    theme: number;
    developerMode: boolean;
    mobileRedesignDisabled: boolean;
    timestampHourCycle: number;
    launchPadMode: number;
    uiDensity: number;
    swipeRightToLeftMode: number;
    // TODO: type
    clientThemeSettings: any;
}

export interface GuildFoldersSettings {
    folders: GuildFolder[];
    guildPositions: string[];
}

export interface AudioContextSettings {
    // TODO: finish these
    user: Record<string, any>;
    stream: Record<string, any>;
}

export interface ClipsSettings {
    allowVoiceRecording: boolean;
}

export interface InAppFeedbackSettings {
    // TODO: finish typing
    inAppFeedbackStates: Record<string, any>;
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
    // TODO: finish typing
    debug: Record<string, any>;
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
    // TODO: type all of these
    versions: any;
    favoriteGifs: any;
    favoriteStickers: any;
    stickerFrecency: any;
    favoriteEmojis: any;
    emojiFrecency: any;
    applicationCommandFrecency: any;
    favoriteSoundboardSounds: any;
    applicationFrecency: any;
    playedSoundFrecency: any;
    guildAndChannelFrecency: any;
    emojiReactionFrecency: any;
}

export interface ProtoState {
    // TODO: type
    proto: any;
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
    // TODO: finish typing
    getGuildDismissedContentState(guildId: string): any;
    getGuildsProto(): Record<string, GuildProto>;
}
