// please keep in alphabetical order
export * from "./AccessibilityStore";
export * from "./ActiveJoinedThreadsStore";
export * from "./ApplicationStore";
export * from "./AuthenticationStore";
export * from "./CallStore";
export * from "./ChannelRTCStore";
export * from "./ChannelStore";
export * from "./DraftStore";
export * from "./EmojiStore";
export * from "./FluxStore";
export * from "./FriendsStore";
export * from "./GuildChannelStore";
export * from "./GuildMemberCountStore";
export * from "./GuildMemberStore";
export * from "./GuildRoleStore";
export * from "./GuildScheduledEventStore";
export * from "./GuildStore";
export * from "./InstantInviteStore";
export * from "./InviteStore";
export * from "./LocaleStore";
export * from "./MediaEngineStore";
export * from "./MessageStore";
export * from "./NotificationSettingsStore";
export * from "./OverridePremiumTypeStore";
export * from "./PermissionStore";
export * from "./PopoutWindowStore";
export * from "./PresenceStore";
export * from "./ReadStateStore";
export * from "./RelationshipStore";
export * from "./RTCConnectionStore";
export * from "./RunningGameStore";
export * from "./SelectedChannelStore";
export * from "./SelectedGuildStore";
export * from "./SoundboardStore";
export * from "./SpellCheckStore";
export * from "./SpotifyStore";
export * from "./StickersStore";
export * from "./StreamerModeStore";
export * from "./ThemeStore";
export * from "./TypingStore";
export * from "./UploadAttachmentStore";
export * from "./UserGuildSettingsStore";
export * from "./UserProfileStore";
export * from "./UserSettingsProtoStore";
export * from "./UserStore";
export * from "./VoiceStateStore";
export * from "./WindowStore";

/**
 * React hook that returns stateful data for one or more stores
 * You might need a custom comparator (4th argument) if your store data is an object
 * @param stores The stores to listen to
 * @param mapper A function that returns the data you need
 * @param dependencies An array of reactive values which the hook depends on. Use this if your mapper or equality function depends on the value of another hook
 * @param isEqual A custom comparator for the data returned by mapper
 *
 * @example const user = useStateFromStores([UserStore], () => UserStore.getCurrentUser(), null, (old, current) => old.id === current.id);
 */
export type useStateFromStores = <T>(
    stores: any[],
    mapper: () => T,
    dependencies?: any,
    isEqual?: (old: T, newer: T) => boolean
) => T;
