/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import type { APIGuild, APIRoleTags, APIUser } from "discord-api-types/v9";
import type { Channel } from "discord-types/general"; // TODO

import type { ExcludeAction, ExtractAction, FluxAction, FluxActionHandlerMap, FluxDispatchBand, FluxDispatcher } from "./utils";

type Nullish = null | undefined;

type FluxChangeListener = () => boolean;

declare class FluxChangeListeners {
    has(listener: FluxChangeListener): boolean;
    hasAny(): boolean;
    invokeAll(): void;

    add: (listener: FluxChangeListener) => void;
    addConditional: (
        listener: FluxChangeListener,
        immediatelyCall?: boolean | undefined /* = true */
    ) => void;
    listeners: Set<FluxChangeListener>;
    remove: (listener: FluxChangeListener) => void;
}

export class FluxStore<Action extends FluxAction = FluxAction> {
    constructor(
        dispatcher: FluxDispatcher,
        actionHandlers: FluxActionHandlerMap<Action>,
        dispatchBand?: FluxDispatchBand | Nullish
    );

    static displayName: string | undefined; // undefined on FluxStore's constructor
    static destroy(): void;
    static getAll(): FluxStore[];
    static initialize(): void;
    static initialized: Promise<undefined>;

    emitChange(): void;
    getDispatchToken(): string;
    getName(): string;
    initialize(): void;
    initializeIfNeeded(): void;
    mustEmitChanges(
        mustEmitChanges?: ((action: Action) => boolean) | Nullish /* = () => true */
    ): void;
    registerActionHandlers(
        actionHandlers: FluxActionHandlerMap<Action>,
        dispatchBand?: FluxDispatchBand | Nullish
    ): void;
    syncWith(
        stores: FluxStore[],
        func: () => boolean | void,
        timeout?: number | Nullish
    ): void;
    waitFor(...stores: FluxStore[]): void;

    __getLocalVars: undefined;
    _changeCallbacks: FluxChangeListeners;
    _dispatcher: FluxDispatcher;
    _dispatchToken: string;
    _isInitialized: boolean;
    _mustEmitChanges: ((action: Action) => boolean) | Nullish;
    _reactChangeCallbacks: FluxChangeListeners;
    _syncWiths: {
        func: () => boolean | void;
        store: FluxStore;
    }[];
    addChangeListener: FluxChangeListeners["add"];
    addConditionalChangeListener: FluxChangeListeners["addConditional"];
    addReactChangeListener: FluxChangeListeners["add"];
    removeChangeListener: FluxChangeListeners["remove"];
    removeReactChangeListener: FluxChangeListeners["remove"];
}

interface GenericConstructor { new (...args: any[]): any }

interface FluxSnapshot<SnapshotData = any> {
    data: SnapshotData;
    version: number;
}

type FluxSnapshotStoreAction = ExcludeAction<FluxAction, "CLEAR_CACHES" | "WRITE_CACHES">;

export class FluxSnapshotStore<
    Constructor extends GenericConstructor = GenericConstructor,
    SnapshotData = any,
    Action extends FluxSnapshotStoreAction = FluxSnapshotStoreAction
> extends FluxStore<Action & Exclude<FluxAction, FluxSnapshotStoreAction>> {
    constructor(actionHandlers: FluxActionHandlerMap<Action>);

    static allStores: FluxSnapshotStore[];
    static displayName: string; // not actually defined on SnapshotStore's constructor, but all subclasses are required to have it
    static clearAll(): void;

    clear(): void;
    getClass(): Constructor;
    get persistKey(): string;
    readSnapshot(version: number): SnapshotData | null;
    save(): void;
}

export interface Flux {
    Store: typeof FluxStore;
}

export type useStateFromStores = <State>(
    stores: FluxStore[],
    getStateFromStores: () => State,
    dependencies?: unknown[] | Nullish,
    areStatesEqual?: ((prevState: State, currState: State) => boolean) | undefined
) => State;

// Original name: Record, renamed to avoid conflict with the Record util type
export class ImmutableRecord<OwnProperties extends object = Record<PropertyKey, any>> {
    merge(collection: Partial<OwnProperties>): this;
    set<Key extends keyof OwnProperties>(key: Key, value: OwnProperties[Key]): this;
    toJS(): OwnProperties;
    update<Key extends keyof OwnProperties>(
        key: Key,
        updater: (value: OwnProperties[Key]) => OwnProperties[Key]
    ): this;
    update<Key extends keyof OwnProperties>(
        key: Key,
        notSetValue: OwnProperties[Key],
        updater: (value: OwnProperties[Key]) => OwnProperties[Key]
    ): this;
}

export interface DraftObject {
    channelId: string;
    timestamp: number;
    draft: string;
}

export enum DraftType {
    ChannelMessage,
    ThreadSettings,
    FirstThreadMessage,
    ApplicationLauncherCommand,
    Poll,
    SlashCommand,
}

interface DraftState {
    [userId: string]: {
        [channelId: string]: {
            [key in DraftType]?: Omit<DraftObject, "channelId">;
        } | undefined;
    } | undefined;
}

export class DraftStore extends FluxStore {
    getDraft(channelId: string, type: DraftType): string;
    getRecentlyEditedDrafts(type: DraftType): DraftObject[];
    getState(): DraftState;
    getThreadDraftWithParentMessageId?(arg: any): any;
    getThreadSettings(channelId: string): any | null;
}

type Emoji = CustomEmoji | UnicodeEmoji;

export interface CustomEmoji {
    allNamesString: string;
    animated: boolean;
    available: boolean;
    guildId: string;
    id: string;
    managed: boolean;
    name: string;
    originalName?: string;
    require_colons: boolean;
    roles: string[];
    url: string;
    type: "GUILD_EMOJI";
}

export interface UnicodeEmoji {
    diversityChildren: Record<any, any>;
    emojiObject: {
        names: string[];
        surrogates: string;
        unicodeVersion: number;
    };
    index: number;
    surrogates: string;
    type: "UNICODE";
    uniqueName: string;
    useSpriteSheet: boolean;
    get allNamesString(): string;
    get animated(): boolean;
    get defaultDiversityChild(): any;
    get hasDiversity(): boolean | undefined;
    get hasDiversityParent(): boolean | undefined;
    get hasMultiDiversity(): boolean | undefined;
    get hasMultiDiversityParent(): boolean | undefined;
    get managed(): boolean;
    get name(): string;
    get names(): string[];
    get optionallyDiverseSequence(): string | undefined;
    get unicodeVersion(): number;
    get url(): string;
}

export class EmojiStore extends FluxStore {
    getCustomEmojiById(id?: string | null): CustomEmoji;
    getUsableCustomEmojiById(id?: string | null): CustomEmoji;
    getGuilds(): Record<string, {
        id: string;
        _emojiMap: Record<string, CustomEmoji>;
        _emojis: CustomEmoji[];
        get emojis(): CustomEmoji[];
        get rawEmojis(): CustomEmoji[];
        _usableEmojis: CustomEmoji[];
        get usableEmojis(): CustomEmoji[];
        _emoticons: any[];
        get emoticons(): any[];
    }>;
    getGuildEmoji(guildId?: string | null): CustomEmoji[];
    getNewlyAddedEmoji(guildId?: string | null): CustomEmoji[];
    getTopEmoji(guildId?: string | null): CustomEmoji[];
    getTopEmojisMetadata(guildId?: string | null): {
        emojiIds: string[];
        topEmojisTTL: number;
    };
    hasPendingUsage(): boolean;
    hasUsableEmojiInAnyGuild(): boolean;
    searchWithoutFetchingLatest(data: any): any;
    getSearchResultsOrder(...args: any[]): any;
    getState(): {
        pendingUsages: { key: string, timestamp: number; }[];
    };
    searchWithoutFetchingLatest(data: {
        channel: Channel,
        query: string;
        count?: number;
        intention: number;
        includeExternalGuilds?: boolean;
        matchComparator?(name: string): boolean;
    }): Record<"locked" | "unlocked", Emoji[]>;

    getDisambiguatedEmojiContext(): {
        backfillTopEmojis: Record<any, any>;
        customEmojis: Record<string, CustomEmoji>;
        emojisById: Record<string, CustomEmoji>;
        emojisByName: Record<string, CustomEmoji>;
        emoticonRegex: RegExp | null;
        emoticonsByName: Record<string, any>;
        escapedEmoticonNames: string;
        favoriteNamesAndIds?: any;
        favorites?: any;
        frequentlyUsed?: any;
        groupedCustomEmojis: Record<string, CustomEmoji[]>;
        guildId?: string;
        isFavoriteEmojiWithoutFetchingLatest(e: Emoji): boolean;
        newlyAddedEmoji: Record<string, CustomEmoji[]>;
        topEmojis?: any;
        unicodeAliases: Record<string, string>;
        get favoriteEmojisWithoutFetchingLatest(): Emoji[];
    };
}

interface AvatarDecorationData {
    asset: string;
    skuId: string;
}

export const enum GuildMemberFlags {
    DID_REJOIN = 1 << 0,
    COMPLETED_ONBOARDING = 1 << 1,
    BYPASSES_VERIFICATION = 1 << 2,
    STARTED_ONBOARDING = 1 << 3,
    IS_GUEST = 1 << 4,
    STARTED_HOME_ACTIONS = 1 << 5,
    COMPLETED_HOME_ACTIONS = 1 << 6,
    AUTOMOD_QUARANTINED_USERNAME_OR_GUILD_NICKNAME = 1 << 7,
    AUTOMOD_QUARANTINED_BIO = 1 << 8,
    DM_SETTINGS_UPSELL_ACKNOWLEDGED = 1 << 9,
    AUTOMOD_QUARANTINED_CLAN_TAG = 1 << 10
}

export interface GuildMember {
    avatar: string | null;
    avatarDecoration: AvatarDecorationData | undefined;
    colorRoleId: string | undefined;
    colorString: string | undefined;
    communicationDisabledUntil: string | Nullish;
    flags: GuildMemberFlags;
    fullProfileLoadedTimestamp: number | undefined;
    guildId: string;
    highestRoleId: string | undefined;
    hoistRoleId: string | undefined;
    iconRoleId: string | undefined;
    isPending: boolean;
    joinedAt: string;
    nick: string | null;
    premiumSince: string | null;
    roles: string[];
    unusualDMActivityUntil: string | Nullish;
    userId: string;
}

type GuildMemberStoreAction = ExtractAction<FluxAction, "CACHE_LOADED" | "CLEAR_PENDING_CHANNEL_AND_ROLE_UPDATES" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_MEMBERS_CHUNK_BATCH" | "GUILD_MEMBER_ADD" | "GUILD_MEMBER_PROFILE_UPDATE" | "GUILD_MEMBER_REMOVE" | "GUILD_MEMBER_UPDATE" | "GUILD_MEMBER_UPDATE_LOCAL" | "GUILD_ROLE_DELETE" | "GUILD_ROLE_MEMBER_ADD" | "GUILD_ROLE_MEMBER_REMOVE" | "GUILD_ROLE_UPDATE" | "IMPERSONATE_STOP" | "IMPERSONATE_UPDATE" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_FORUM_POSTS" | "LOAD_MESSAGES_AROUND_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_PINNED_MESSAGES_SUCCESS" | "LOAD_RECENT_MENTIONS_SUCCESS" | "LOCAL_MESSAGES_LOADED" | "MEMBER_SAFETY_GUILD_MEMBER_SEARCH_SUCCESS" | "MESSAGE_CREATE" | "MESSAGE_UPDATE" | "MOD_VIEW_SEARCH_FINISH" | "OVERLAY_INITIALIZE" | "PASSIVE_UPDATE_V1" | "SEARCH_FINISH" | "THREAD_MEMBERS_UPDATE" | "THREAD_MEMBER_LIST_UPDATE">;

export class GuildMemberStore<Action extends FluxAction = GuildMemberStoreAction> extends FluxStore<Action> {
    static displayName: "GuildMemberStore";

    getCommunicationDisabledUserMap(): Record</* userId: */string, /* communicationDisabledUntil: */string>;
    getCommunicationDisabledVersion(): number;
    getMember(guildId: string, userId: string): GuildMember | null; // TEMP
    getMemberIds(guildId?: string | Nullish): string[];
    getMemberRoleWithPendingUpdates(guildId: string, userId: string): string[];
    getMembers(guildId?: string | Nullish): GuildMember[];
    getMemberVersion(): number;
    getMutableAllGuildsAndMembers(): Record</* guildId: */string, Record</* userId: */string, GuildMember>>;
    getNick(guildId?: string | Nullish, userId?: string | Nullish): string | null;
    getNicknameGuildsMapping(userId: string): Record</* nickname: */string, /* guildIds: */string[]>;
    getNicknames(userId: string): string[];
    getPendingRoleUpdates(guildId: string): {
        added: string[]
        removed: string[]
    };
    getSelfMember(guildId: string): GuildMember | null;
    getTrueMember(guildId: string, userId: string): GuildMember | null;
    isCurrentUserGuest(guildId?: string | Nullish): boolean;
    isGuestOrLurker(guildId?: string | Nullish, userId?: string | Nullish): boolean;
    isMember(guildId?: string | Nullish, userId?: string | Nullish): boolean;
    memberOf(userId: string): string[];
}

export const enum RoleFlags {
    IN_PROMPT = 1
}

/*
// bigint enums are not yet possible: https://github.com/microsoft/TypeScript/issues/37783
export const enum Permissions {
    CREATE_INSTANT_INVITE = 1n << 0n,
    KICK_MEMBERS = 1n << 1n,
    BAN_MEMBERS = 1n << 2n,
    ADMINISTRATOR = 1n << 3n,
    MANAGE_CHANNELS = 1n << 4n,
    MANAGE_GUILD = 1n << 5n,
    ADD_REACTIONS = 1n << 6n,
    VIEW_AUDIT_LOG = 1n << 7n,
    PRIORITY_SPEAKER = 1n << 8n,
    STREAM = 1n << 9n,
    VIEW_CHANNEL = 1n << 10n,
    SEND_MESSAGES = 1n << 11n,
    SEND_TTS_MESSAGES = 1n << 12n,
    MANAGE_MESSAGES = 1n << 13n,
    EMBED_LINKS = 1n << 14n,
    ATTACH_FILES = 1n << 15n,
    READ_MESSAGE_HISTORY = 1n << 16n,
    MENTION_EVERYONE = 1n << 17n,
    USE_EXTERNAL_EMOJIS = 1n << 18n,
    VIEW_GUILD_ANALYTICS = 1n << 19n,
    CONNECT = 1n << 20n,
    SPEAK = 1n << 21n,
    MUTE_MEMBERS = 1n << 22n,
    DEAFEN_MEMBERS = 1n << 23n,
    MOVE_MEMBERS = 1n << 24n,
    USE_VAD = 1n << 25n,
    CHANGE_NICKNAME = 1n << 26n,
    MANAGE_NICKNAMES = 1n << 27n,
    MANAGE_ROLES = 1n << 28n,
    MANAGE_WEBHOOKS = 1n << 29n,
    MANAGE_GUILD_EXPRESSIONS = 1n << 30n,
    USE_APPLICATION_COMMANDS = 1n << 31n,
    REQUEST_TO_SPEAK = 1n << 32n,
    MANAGE_EVENTS = 1n << 33n,
    MANAGE_THREADS = 1n << 34n,
    CREATE_PUBLIC_THREADS = 1n << 35n,
    CREATE_PRIVATE_THREADS = 1n << 36n,
    USE_EXTERNAL_STICKERS = 1n << 37n,
    SEND_MESSAGES_IN_THREADS = 1n << 38n,
    USE_EMBEDDED_ACTIVITIES = 1n << 39n,
    MODERATE_MEMBERS = 1n << 40n,
    VIEW_CREATOR_MONETIZATION_ANALYTICS = 1n << 41n,
    USE_SOUNDBOARD = 1n << 42n,
    CREATE_GUILD_EXPRESSIONS = 1n << 43n,
    CREATE_EVENTS = 1n << 44n,
    USE_EXTERNAL_SOUNDS = 1n << 45n,
    SEND_VOICE_MESSAGES = 1n << 46n,
    USE_CLYDE_AI = 1n << 47n,
    SET_VOICE_CHANNEL_STATUS = 1n << 48n,
    SEND_POLLS = 1n << 49n
}
*/

export interface Role {
    color: number;
    colorString: string | null;
    flags: RoleFlags;
    hoist: boolean;
    icon: string | null;
    id: string;
    managed: boolean;
    mentionable: boolean;
    name: string;
    originalPosition: number;
    permissions: bigint /* Permissions */;
    position: number;
    tags: APIRoleTags;
    unicodeEmoji: string | null;
}

type GuildRecordOwnProperties = Pick<GuildRecord, "afkChannelId" | "afkTimeout" | "application_id" | "banner" | "clan" | "defaultMessageNotifications" | "description" | "discoverySplash" | "explicitContentFilter" | "features" | "homeHeader" | "hubType" | "icon" | "id" | "joinedAt" | "latestOnboardingQuestionId" | "maxMembers" | "maxStageVideoChannelUsers" | "maxVideoChannelUsers" | "mfaLevel" | "name" | "nsfwLevel" | "ownerId" | "preferredLocale" | "premiumProgressBarEnabled" | "premiumSubscriberCount" | "premiumTier" | "publicUpdatesChannelId" | "rulesChannelId" | "safetyAlertsChannelId" | "splash" | "systemChannelFlags" | "systemChannelId" | "vanityURLCode" | "verificationLevel">;

export class GuildRecord<
    OwnProperties extends GuildRecordOwnProperties = GuildRecordOwnProperties
> extends ImmutableRecord<OwnProperties> {
    constructor(guildFromServer: APIGuild);

    get acronym(): ; // TEMP
    canHaveRaidActivityAlerts(): ; // TEMP
    getApplicationId(): ; // TEMP
    getEveryoneRoleId(): ; // TEMP
    getIconSource(e: ): ; // TEMP
    getIconURL(e: ): ; // TEMP
    getMaxEmojiSlots(): ; // TEMP
    getMaxRoleSubscriptionEmojiSlots(): ; // TEMP
    getMaxSoundboardSlots(): ; // TEMP
    getSafetyAlertsChannelId(): ; // TEMP
    isCommunity(): ; // TEMP
    isLurker(): ; // TEMP
    isNew(): ; // TEMP
    isOwner(e: ): ; // TEMP
    isOwnerWithRequiredMfaLevel(e: ): ; // TEMP
    hasCommunityInfoSubheader(): ; // TEMP
    hasFeature(e: ): ; // TEMP
    hasVerificationGate(): ; // TEMP
    merge(e: ): ; // TEMP
    updateJoinedAt(e: ): ; // TEMP

    afkChannelId: ; // TEMP
    afkTimeout: ; // TEMP
    application_id: ; // TEMP
    banner: ; // TEMP
    clan: ; // TEMP
    defaultMessageNotifications: ; // TEMP
    description: ; // TEMP
    discoverySplash: ; // TEMP
    explicitContentFilter: ; // TEMP
    features: ; // TEMP
    homeHeader: ; // TEMP
    hubType: ; // TEMP
    icon: ; // TEMP
    id: ; // TEMP
    joinedAt: ; // TEMP
    latestOnboardingQuestionId: ; // TEMP
    maxMembers: ; // TEMP
    maxStageVideoChannelUsers: ; // TEMP
    maxVideoChannelUsers: ; // TEMP
    mfaLevel: ; // TEMP
    name: ; // TEMP
    nsfwLevel: ; // TEMP
    ownerId: ; // TEMP
    preferredLocale: ; // TEMP
    premiumProgressBarEnabled: ; // TEMP
    premiumSubscriberCount: ; // TEMP
    premiumTier: ; // TEMP
    publicUpdatesChannelId: ; // TEMP
    rulesChannelId: ; // TEMP
    safetyAlertsChannelId: ; // TEMP
    splash: ; // TEMP
    systemChannelFlags: ; // TEMP
    systemChannelId: ; // TEMP
    vanityURLCode: ; // TEMP
    verificationLevel: ; // TEMP
}

type GuildStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC" | "CACHE_LOADED" | "CACHE_LOADED_LAZY" | "CONNECTION_OPEN" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_GEO_RESTRICTED" | "GUILD_MEMBER_ADD" | "GUILD_ROLE_CREATE" | "GUILD_ROLE_DELETE" | "GUILD_ROLE_UPDATE" | "GUILD_SETTINGS_SUBMIT_SUCCESS" | "GUILD_UPDATE" | "OVERLAY_INITIALIZE">;

export class GuildStore<Action extends FluxAction = GuildStoreAction> extends FluxStore<Action> {
    static displayName: "GuildStore";

    getAllGuildsRoles(): Record</* guildId: */string, Record</* roleId: */string, Role>>;
    getGeoRestrictedGuilds(): Record</* guildId: */string, GuildRecord>;
    getGuild(guildId?: string | Nullish): GuildRecord;
    getGuildCount(): number;
    getGuildIds(): string[];
    getGuilds(): Record</* guildId: */string, GuildRecord>;
    getRole(guildId: string, roleId: string): Role;
    getRoles(guildId: string): Record</* roleId: */string, Role>;
    isLoaded(): boolean;
}

export const enum ApplicationFlags {
    EMBEDDED_RELEASED = 1 << 1,
    EMBEDDED_IAP = 1 << 3,
    APPLICATION_AUTO_MODERATION_RULE_CREATE_BADGE = 1 << 6,
    GATEWAY_PRESENCE = 1 << 12,
    GATEWAY_PRESENCE_LIMITED = 1 << 13,
    GATEWAY_GUILD_MEMBERS = 1 << 14,
    GATEWAY_GUILD_MEMBERS_LIMITED = 1 << 15,
    EMBEDDED = 1 << 17,
    GATEWAY_MESSAGE_CONTENT = 1 << 18,
    GATEWAY_MESSAGE_CONTENT_LIMITED = 1 << 19,
    EMBEDDED_FIRST_PARTY = 1 << 20,
    APPLICATION_COMMAND_BADGE = 1 << 23,
    SOCIAL_LAYER_INTEGRATION = 1 << 27
}

export const enum OAuth2Scopes {
    ACTIVITIES_READ = "activities.read",
    ACTIVITIES_WRITE = "activities.write",
    APPLICATIONS_BUILDS_READ = "applications.builds.read",
    APPLICATIONS_BUILDS_UPLOAD = "applications.builds.upload",
    APPLICATIONS_COMMANDS = "applications.commands",
    APPLICATIONS_COMMANDS_PERMISSIONS_UPDATE = "applications.commands.permissions.update",
    APPLICATIONS_COMMANDS_UPDATE = "applications.commands.update",
    APPLICATIONS_ENTITLEMENTS = "applications.entitlements",
    APPLICATIONS_STORE_UPDATE = "applications.store.update",
    BOT = "bot",
    CONNECTIONS = "connections",
    DM_CHANNELS_MESSAGES_READ = "dm_channels.messages.read",
    DM_CHANNELS_MESSAGES_WRITE = "dm_channels.messages.write",
    DM_CHANNELS_READ = "dm_channels.read",
    EMAIL = "email",
    GDM_JOIN = "gdm.join",
    GUILDS = "guilds",
    GUILDS_JOIN = "guilds.join",
    GUILDS_MEMBERS_READ = "guilds.members.read",
    IDENTIFY = "identify",
    MESSAGES_READ = "messages.read",
    OPENID = "openid",
    PRESENCES_READ = "presences.read",
    PRESENCES_WRITE = "presences.write",
    RELATIONSHIPS_READ = "relationships.read",
    RELATIONSHIPS_WRITE = "relationships.write",
    ROLE_CONNECTIONS_WRITE = "role_connections.write",
    RPC = "rpc",
    RPC_ACTIVITIES_WRITE = "rpc.activities.write",
    RPC_NOTIFICATIONS_READ = "rpc.notifications.read",
    RPC_SCREENSHARE_READ = "rpc.screenshare.read",
    RPC_SCREENSHARE_WRITE = "rpc.screenshare.write",
    RPC_VIDEO_READ = "rpc.video.read",
    RPC_VIDEO_WRITE = "rpc.video.write",
    RPC_VOICE_READ = "rpc.voice.read",
    RPC_VOICE_WRITE = "rpc.voice.write",
    VOICE = "voice",
    WEBHOOK_INCOMING = "webhook.incoming"
}

export const enum ApplicationIntegrationType {
    GUILD_INSTALL = 0,
    USER_INSTALL = 1
}

interface UserProfileFetchFailed {
    accentColor: null;
    application: null;
    applicationRoleConnections: [];
    banner: null;
    bio: "";
    connectedAccounts: [];
    lastFetched: number;
    legacyUsername: null;
    premiumGuildSince: null;
    premiumSince: null;
    profileFetchFailed: true;
    pronouns: "";
    userId: string;
}

interface UserProfileFetchSucceeded {
    application: {
        customInstallUrl: string | Nullish;
        flags: ApplicationFlags;
        id: string;
        installParams: {
            scopes: OAuth2Scopes[] | Nullish;
            permissions: string | Nullish;
        } | Nullish;
        integrationTypesConfig: Partial<Record<ApplicationIntegrationType, any /* | Nullish */>> | Nullish; // TEMP
        popularApplicationCommandIds: string[] | undefined;
        primarySkuId: string | Nullish;
        storefront_available: boolean;
    } | null;
    accentColor: number | Nullish;
    applicationRoleConnections: any[]; // TEMP
    badges: {
        description: string;
        icon: string;
        id: string;
        link?: string;
    }[];
    banner: string | Nullish;
    bio: string;
    connectedAccounts: {
        id: string;
        metadata?: Record<string, any>;
        name: string;
        type: string;
        verified: boolean;
    }[];
    lastFetched: number;
    legacyUsername: string | Nullish;
    popoutAnimationParticleType: Nullish; // TEMP
    premiumGuildSince: Date | null;
    premiumSince: Date | null;
    premiumType: PremiumTypes | Nullish;
    profileEffectId: string | undefined;
    profileFetchFailed: false;
    pronouns: string;
    themeColors: [primaryColor: number, accentColor: number] | Nullish;
    userId: string;
}

export type UserProfile<FetchFailed extends boolean = boolean> = FetchFailed extends true
    ? UserProfileFetchFailed
    : UserProfileFetchSucceeded;


export const enum StatusTypes {
    DND = "dnd",
    IDLE = "idle",
    INVISIBLE = "invisible",
    OFFLINE = "offline",
    ONLINE = "online",
    STREAMING = "streaming",
    UNKNOWN = "unknown"
}

interface UserProfileStoreSnapshotData {
    userId: string;
    profile: UserProfile | undefined;
}

type UserProfileStoreAction = ExtractAction<FluxAction, "CACHE_LOADED_LAZY" | "GUILD_DELETE" | "GUILD_JOIN" | "GUILD_MEMBER_ADD" | "GUILD_MEMBER_REMOVE" | "GUILD_MEMBER_UPDATE" | "LOGOUT" | "MUTUAL_FRIENDS_FETCH_FAILURE" | "MUTUAL_FRIENDS_FETCH_START" | "MUTUAL_FRIENDS_FETCH_SUCCESS" | "USER_PROFILE_ACCESSIBILITY_TOOLTIP_VIEWED" | "USER_PROFILE_FETCH_FAILURE" | "USER_PROFILE_FETCH_START" | "USER_PROFILE_FETCH_SUCCESS" | "USER_PROFILE_UPDATE_FAILURE" | "USER_PROFILE_UPDATE_START" | "USER_PROFILE_UPDATE_SUCCESS" | "USER_UPDATE">;

export class UserProfileStore extends FluxSnapshotStore<typeof UserProfileStore, UserProfileStoreSnapshotData> {
    static displayName: "UserProfileStore";
    static LATEST_SNAPSHOT_VERSION: number;

    getUserProfile<FetchFailed extends boolean = boolean>(userId: string): UserProfile<FetchFailed> | undefined;
    getGuildMemberProfile(userId: string, guildId?: string | Nullish): Record<string, any> /* | Nullish */; // TEMP
    getIsAccessibilityTooltipViewed(): boolean;
    getMutualFriends(userId: string): {
        key: string; // userId
        status: StatusTypes;
        user: UserRecord;
    }[];
    getMutualFriendsCount(userId: string): number;
    getMutualGuilds(userId: string): {
        guild: Record<string, any>; // TEMP
        nick: string | null;
    }[];
    isFetchingFriends(userId: string): boolean;
    isFetchingProfile(userId: string): boolean;
    get isSubmitting(): boolean;
    takeSnapshot(): FluxSnapshot<UserProfileStoreSnapshotData>;

    loadCache: () => void;
}

export const enum UserFlags {
    STAFF = 1 << 0,
    PARTNER = 1 << 1,
    HYPESQUAD = 1 << 2,
    BUG_HUNTER_LEVEL_1 = 1 << 3,
    MFA_SMS = 1 << 4,
    PREMIUM_PROMO_DISMISSED = 1 << 5,
    HYPESQUAD_ONLINE_HOUSE_1 = 1 << 6,
    HYPESQUAD_ONLINE_HOUSE_2 = 1 << 7,
    HYPESQUAD_ONLINE_HOUSE_3 = 1 << 8,
    PREMIUM_EARLY_SUPPORTER = 1 << 9,
    TEAM_PSEUDO_USER = 1 << 10,
    HAS_UNREAD_URGENT_MESSAGES = 1 << 13,
    BUG_HUNTER_LEVEL_2 = 1 << 14,
    VERIFIED_BOT = 1 << 16,
    VERIFIED_DEVELOPER = 1 << 17,
    CERTIFIED_MODERATOR = 1 << 18,
    BOT_HTTP_INTERACTIONS = 1 << 19,
    SPAMMER = 1 << 20,
    DISABLE_PREMIUM = 1 << 21,
    ACTIVE_DEVELOPER = 1 << 22,
    QUARANTINED = 0x100_000_000_000,
    COLLABORATOR = 0x4_000_000_000_000,
    RESTRICTED_COLLABORATOR = 0x8_000_000_000_000
}

export const enum PremiumTypes {
    TIER_1 = 1,
    TIER_2 = 2,
    TIER_0 = 3
}

type UserRecordOwnProperties = Pick<UserRecord, "avatar" | "avatarDecorationData" | "bot" | "clan" | "desktop" | "discriminator" | "email" | "flags" | "globalName" | "guildMemberAvatars" | "hasAnyStaffLevel" | "hasBouncedEmail" | "hasFlag" | "id" | "isStaff" | "isStaffPersonal" | "mfaEnabled" | "mobile" | "nsfwAllowed" | "personalConnectionId" | "phone" | "premiumType" | "premiumUsageFlags" | "publicFlags" | "purchasedFlags" | "system" | "username" | "verified">;

export class UserRecord<
    OwnProperties extends UserRecordOwnProperties = UserRecordOwnProperties
> extends ImmutableRecord<OwnProperties> {
    constructor(userFromServer: APIUser);

    addGuildAvatarHash(guildId: string, avatarHash: string): this;
    get avatarDecoration(): AvatarDecorationData | null;
    set avatarDecoration(avatarDecorationData: {
        asset: string;
        skuId?: string;
        sku_id?: string;
    } | null);
    get createdAt(): Date;
    getAvatarSource(
        guildId?: string | Nullish,
        canAnimate?: boolean | undefined,
        avatarSize?: number | undefined
    ): { uri: string; };
    getAvatarURL(
        guildId?: string | Nullish,
        avatarSize?: number | undefined,
        canAnimate?: boolean | undefined
    ): string;
    hasAvatarForGuild(guildId?: string | Nullish): boolean;
    hasDisabledPremium(): boolean;
    hasFreePremium(): boolean;
    hasHadPremium(): boolean;
    hasHadSKU(skuId: string): boolean;
    hasPremiumUsageFlag(flag: number): boolean;
    hasPurchasedFlag(flag: number): boolean;
    hasUrgentMessages(): boolean;
    hasVerifiedEmailOrPhone(): boolean;
    isClaimed(): boolean;
    isClyde(): boolean;
    isLocalBot(): boolean;
    isNonUserBot(): boolean;
    isPhoneVerified(): boolean;
    isPomelo(): boolean;
    isSystemUser(): boolean;
    isVerifiedBot(): boolean;
    removeGuildAvatarHash(guildId: string): UserRecord;
    get tag(): string;

    avatar: string | null;
    avatarDecorationData: AvatarDecorationData | null;
    banner: string | Nullish;
    bot: boolean;
    clan: {
        badge: string | Nullish;
        identityEnabled: boolean | undefined;
        identityGuildId: string | Nullish;
        tag: string | Nullish;
    } | null;
    desktop: boolean;
    discriminator: string;
    email: string | null;
    flags: UserFlags;
    globalName: string | Nullish;
    guildMemberAvatars: Record</* guildId: */string, /* avatarHash: */string>;
    hasAnyStaffLevel: () => boolean;
    hasBouncedEmail: boolean;
    hasFlag: (flag: number) => boolean;
    id: string;
    isStaff: () => boolean;
    isStaffPersonal: () => boolean;
    mfaEnabled: boolean;
    mobile: boolean;
    nsfwAllowed: boolean;
    personalConnectionId: string | null;
    phone: string | null;
    premiumType: PremiumTypes | Nullish; // discord seems to have recently made it so that premiumType is nullish for every UserRecord
    premiumUsageFlags: number;
    publicFlags: UserFlags;
    purchasedFlags: number;
    system: boolean;
    username: string;
    verified: boolean;
}

interface UserStoreSnapshotData { users: [UserRecord] | []; }

type UserStoreAction = ExtractAction<FluxAction, "AUDIT_LOG_FETCH_NEXT_PAGE_SUCCESS" | "AUDIT_LOG_FETCH_SUCCESS" | "CACHE_LOADED" | "CHANNEL_CREATE" | "CHANNEL_RECIPIENT_ADD" | "CHANNEL_RECIPIENT_REMOVE" | "CHANNEL_UPDATES" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "CURRENT_USER_UPDATE" | "FAMILY_CENTER_INITIAL_LOAD" | "FAMILY_CENTER_LINKED_USERS_FETCH_SUCCESS" | "FAMILY_CENTER_REQUEST_LINK_SUCCESS" | "FAMILY_CENTER_TEEN_ACTIVITY_FETCH_SUCCESS" | "FAMILY_CENTER_TEEN_ACTIVITY_MORE_FETCH_SUCCESS" | "FETCH_PRIVATE_CHANNEL_INTEGRATIONS_SUCCESS" | "FRIEND_SUGGESTION_CREATE" | "GIFT_CODE_RESOLVE_SUCCESS" | "GUILD_APPLIED_BOOSTS_FETCH_SUCCESS" | "GUILD_BAN_ADD" | "GUILD_BAN_REMOVE" | "GUILD_CREATE" | "GUILD_FEED_FETCH_SUCCESS" | "GUILD_JOIN_REQUEST_CREATE" | "GUILD_JOIN_REQUEST_UPDATE" | "GUILD_MEMBERS_CHUNK_BATCH" | "GUILD_MEMBER_ADD" | "GUILD_MEMBER_LIST_UPDATE" | "GUILD_MEMBER_UPDATE" | "GUILD_SCHEDULED_EVENT_USERS_FETCH_SUCCESS" | "GUILD_SETTINGS_LOADED_BANS" | "GUILD_SETTINGS_LOADED_BANS_BATCH" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_FORUM_POSTS" | "LOAD_FRIEND_SUGGESTIONS_SUCCESS" | "LOAD_MESSAGES_AROUND_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_MESSAGE_REQUESTS_SUPPLEMENTAL_DATA_SUCCESS" | "LOAD_NOTIFICATION_CENTER_ITEMS_SUCCESS" | "LOAD_PINNED_MESSAGES_SUCCESS" | "LOAD_RECENT_MENTIONS_SUCCESS" | "LOAD_RELATIONSHIPS_SUCCESS" | "LOAD_THREADS_SUCCESS" | "LOCAL_MESSAGES_LOADED" | "MEMBER_SAFETY_GUILD_MEMBER_SEARCH_SUCCESS" | "MESSAGE_CREATE" | "MESSAGE_UPDATE" | "MOD_VIEW_SEARCH_FINISH" | "NOTIFICATION_CENTER_ITEM_CREATE" | "OVERLAY_INITIALIZE" | "PASSIVE_UPDATE_V1" | "PRESENCE_UPDATES" | "PRIVATE_CHANNEL_INTEGRATION_CREATE" | "PRIVATE_CHANNEL_INTEGRATION_UPDATE" | "RELATIONSHIP_ADD" | "SEARCH_FINISH" | "THREAD_LIST_SYNC" | "THREAD_MEMBERS_UPDATE" | "THREAD_MEMBER_LIST_UPDATE" | "UPDATE_CLIENT_PREMIUM_TYPE" | "USER_UPDATE">;

export class UserStore extends FluxSnapshotStore<typeof UserStore, UserStoreSnapshotData, UserStoreAction> {
    constructor();

    static displayName: "UserStore";
    static LATEST_SNAPSHOT_VERSION: number;

    filter(predicate: (user: UserRecord) => any, sort?: boolean | undefined): UserRecord[];
    findByTag(username: string, discriminator?: string | Nullish): UserRecord | undefined;
    forEach(callback: (user: UserRecord) => void): void;
    getCurrentUser(): UserRecord | Nullish; // returns undefined if called before the first USER_UPDATE action for the current user. discord seems to always check != null too
    getUser(userId: string): UserRecord | Nullish;
    getUsers(): Record<string, UserRecord>;
    getUserStoreVersion(): number;
    handleLoadCache(cache: {
        initialGuildChannels: any[]; // TEMP
        privateChannels: any[]; // TEMP
        users: any[] | Nullish; // TEMP
    }): void;
    takeSnapshot(): FluxSnapshot<UserStoreSnapshotData>;
}

export class WindowStore extends FluxStore {
    isElementFullScreen(): boolean;
    isFocused(): boolean;
    windowSize(): Record<"width" | "height", number>;
}
