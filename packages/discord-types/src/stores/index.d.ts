// please keep in alphabetical order
export * from "./AuthenticationStore";
export * from "./ChannelStore";
export * from "./DraftStore";
export * from "./EmojiStore";
export * from "./FluxStore";
export * from "./GuildMemberStore";
export * from "./GuildRoleStore";
export * from "./GuildStore";
export * from "./MessageStore";
export * from "./RelationshipStore";
export * from "./SelectedChannelStore";
export * from "./SelectedGuildStore";
export * from "./StickersStore";
export * from "./ThemeStore";
export * from "./TypingStore";
export * from "./UserProfileStore";
export * from "./UserStore";
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
