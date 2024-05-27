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

import type { Duration, Moment } from "moment";
import type { SnakeCasedProperties } from "type-fest";

import type { ExcludeAction, ExtractAction, FluxAction, FluxActionHandlerMap, FluxDispatchBand, FluxDispatcher } from "./utils";

type Defined<T> = Exclude<T, undefined>;

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

export abstract class FluxStore<Action extends FluxAction = FluxAction> {
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
    initialize(...args: unknown[]): void;
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

interface GenericConstructor {
    new (...args: any[]): any;
}

export abstract class FluxPersistedStore<
    Constructor extends GenericConstructor = GenericConstructor,
    State = any,
    Action extends FluxAction = FluxAction
> extends FluxStore<Action> {
    constructor(dispatcher: FluxDispatcher, actionHandlerst: FluxActionHandlerMap<Action>);

    static _clearAllPromise: Promise<void> | Nullish;
    static _writePromises: Map<any, any>; // TEMP
    static _writeResolvers: Map<any, any>; // TEMP
    static allPersistKeys: Set<string>;
    static clearAll(e: any): Promise<void>; // TEMP
    static clearPersistQueue(e: any): void; // TEMP
    static disableWrite: boolean;
    static disableWrites: boolean;
    static getAllStates(): Promise<any>; // TEMP
    static initializeAll(stateMap: Record<string, any>): void; // TEMP
    static migrateAndReadStoreState(e: any, t: any): { // TEMP
        state: any /* | undefined */; // TEMP
        requiresPersist: boolean;
    };
    static migrations: ((...args: any[]) => any)[] | undefined;
    static persistKey: string; // not actually defined on PersistedStore's constructor, but all subclasses are required to have it
    static shouldClear(e: any, t: any): boolean; // TEMP
    static throttleDelay: number;
    static userAgnosticPersistKeys: Set<string>;

    asyncPersist(): Promise<boolean | void>;
    clear(): void;
    getClass(): Constructor;
    abstract getState(): State; // TEMP
    abstract initialize(state: State): void; // TEMP
    initializeFromState(state: State): void; // TEMP
    persist(): void;

    _version: number;
    callback: (callback: () => void) => void;
    throttledCallback: {
        (callback: () => void): () => void;
        cancel: () => void;
        flush: () => () => void;
    };
}

interface FluxSnapshot<SnapshotData = any> {
    data: SnapshotData;
    version: number;
}

type FluxSnapshotStoreAction = ExcludeAction<FluxAction, "CLEAR_CACHES" | "WRITE_CACHES">;

export abstract class FluxSnapshotStore<
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
    abstract takeSnapshot(): FluxSnapshot<SnapshotData>;
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
    SEND_POLLS = 1n << 49n,
}
*/

export interface ForumTag {
    id: string;
    emojiId: string | null;
    emojiName: string | null;
    moderated: boolean;
    name: string;
}

export const enum FormLayout {
    DEFAULT = 0,
    LIST = 1,
    GRID = 2,
}

export const enum ThreadSortOrder {
    LATEST_ACTIVITY = 0,
    CREATION_DATE = 1,
}

export const enum ChannelFlags {
    GUILD_FEED_REMOVED = 1 << 0,
    PINNED = 1 << 1,
    ACTIVE_CHANNELS_REMOVED = 1 << 2,
    REQUIRE_TAG = 1 << 4,
    IS_SPAM = 1 << 5,
    IS_GUILD_RESOURCE_CHANNEL = 1 << 7,
    CLYDE_AI = 1 << 8,
    IS_SCHEDULED_FOR_DELETION = 1 << 9,
    IS_MEDIA_CHANNEL = 1 << 10,
    SUMMARIES_DISABLED = 1 << 11,
    IS_ROLE_SUBSCRIPTION_TEMPLATE_PREVIEW_CHANNEL = 1 << 13,
    IS_BROADCASTING = 1 << 14,
    HIDE_MEDIA_DOWNLOAD_OPTIONS = 1 << 15,
    IS_JOIN_REQUEST_INTERVIEW_CHANNEL = 1 << 16,
}

export const enum ThreadMemberFlags {
    HAS_INTERACTED = 1 << 0,
    ALL_MESSAGES = 1 << 1,
    ONLY_MENTIONS = 1 << 2,
    NO_MESSAGES = 1 << 3,
}

export interface ThreadMember {
    flags: ThreadMemberFlags;
    joinTimestamp: string;
    muteConfig: {
        end_time: string | null;
        selected_time_window: number;
    } | null;
    muted: boolean;
}

export const enum PermissionOverwriteType {
    ROLE = 0,
    MEMBER = 1,
}

export interface PermissionOverwrite {
    allow: /* Permissions */ bigint;
    deny: /* Permissions */ bigint;
    id: string;
    type: PermissionOverwriteType;
}

interface PermissionOverwriteMap {
    [roleIdOrUserId: string]: PermissionOverwrite;
}

export interface ChannelRecipient {
    avatar: string | null;
    avatar_decoration_data: SnakeCasedProperties<AvatarDecorationData> | null;
    bot?: boolean;
    clan: SnakeCasedProperties<UserClanData> | null;
    discriminator: string;
    display_name?: string | null;
    global_name: string | null;
    id: string;
    public_flags: UserFlags;
    username: string;
}

export const enum SafetyWarningTypes {
    STRANGER_DANGER = 1,
    INAPPROPRIATE_CONVERSATION_TIER_1 = 2,
    INAPPROPRIATE_CONVERSATION_TIER_2 = 3,
}

export interface SafetyWarning {
    type: SafetyWarningTypes;
    dismiss_timestamp?: string | Nullish; // TEMP
}

export interface ThreadMetadata {
    archived: boolean;
    archiveTimestamp: string;
    autoArchiveDuration: number;
    createTimestamp: string | Nullish;
    invitable: boolean;
    locked: boolean;
}

export const enum ChannelTypes {
    GUILD_TEXT = 0,
    DM = 1,
    GUILD_VOICE = 2,
    GROUP_DM = 3,
    GUILD_CATEGORY = 4,
    GUILD_ANNOUNCEMENT = 5,
    GUILD_STORE = 6,
    ANNOUNCEMENT_THREAD = 10,
    PUBLIC_THREAD = 11,
    PRIVATE_THREAD = 12,
    GUILD_STAGE_VOICE = 13,
    GUILD_DIRECTORY = 14,
    GUILD_FORUM = 15,
    GUILD_MEDIA = 16,
    UNKNOWN = 10_000,
}

export const enum VideoQualityMode {
    AUTO = 1,
    FULL = 2,
}

export const enum VoiceCallBackgroundTypes {
    EMPTY = 0,
    GRADIENT = 1,
}

type ChannelRecordOwnPropertyKeys = "application_id" | "appliedTags" | "availableTags" | "bitrate_" | "defaultAutoArchiveDuration" | "defaultForumLayout" | "defaultReactionEmoji" | "defaultSortOrder" | "defaultThreadRateLimitPerUser" | "flags_" | "guild_id" | "icon" | "iconEmoji" | "id" | "isMessageRequest" | "isMessageRequestTimestamp" | "isSpam" | "lastMessageId" | "lastPinTimestamp" | "member" | "memberCount" | "memberIdsPreview" | "memberListId" | "messageCount" | "name" | "nicks" | "nsfw_" | "originChannelId" | "ownerId" | "parentChannelThreadType" | "parent_id" | "permissionOverwrites_" | "position_" | "rateLimitPerUser_" | "rawRecipients" | "recipients" | "rtcRegion" | "safetyWarnings" | "template" | "themeColor" | "threadMetadata" | "topic_" | "totalMessageSent" | "type" | "userLimit_" | "version" | "videoQualityMode";

type ChannelRecordOwnProperties<ChannelRecord extends ChannelRecordBase> = Pick<ChannelRecord, ChannelRecordOwnPropertyKeys>;

// does not extend ImmutableRecord
export abstract class ChannelRecordBase {
    constructor(channelProperties: Record<string, any>); // TEMP

    get accessPermissions(): /* Permissions */ bigint;
    get bitrate(): number;
    computeLurkerPermissionsAllowList(): /* Permissions */ bigint | undefined;
    get flags(): ChannelFlags;
    getApplicationId(): this["application_id"];
    getDefaultLayout(): FormLayout;
    getDefaultSortOrder(): ThreadSortOrder;
    getGuildId(): this["guild_id"];
    hasFlag(flag: ChannelFlags): boolean;
    isActiveThread(): boolean; // requires https://github.com/microsoft/TypeScript/issues/15048
    isAnnouncementThread(): this is ThreadChannelRecord<ChannelTypes.ANNOUNCEMENT_THREAD>;
    isArchivedLockedThread(): boolean; // requires https://github.com/microsoft/TypeScript/issues/15048
    isArchivedThread(): boolean; // requires https://github.com/microsoft/TypeScript/issues/15048
    isBroadcastChannel(): boolean;
    isCategory(): this is GuildCategoryChannelRecord;
    isDM(): this is DMChannelRecord;
    isDirectory(): this is GuildDirectoryChannelRecord;
    isForumChannel(): this is GuildForumChannelRecord;
    isForumLikeChannel(): this is ForumChannelRecord;
    isForumPost(): boolean; // requires https://github.com/microsoft/TypeScript/issues/15048
    isGroupDM(): this is GroupDMChannelRecord;
    isGuildStageVoice(): this is GuildStageVoiceChannelRecord;
    isGuildVocal(): this is GuildVocalChannelRecord;
    isGuildVocalOrThread(): this is GuildVocalChannelRecord | ThreadChannelRecord<ChannelTypes.PUBLIC_THREAD | ChannelTypes.PRIVATE_THREAD>;
    isGuildVoice(): this is GuildVoiceChannelRecord;
    isListenModeCapable(): this is GuildStageVoiceChannelRecord;
    isLockedThread(): boolean; // requires https://github.com/microsoft/TypeScript/issues/15048
    isManaged(): boolean;
    isMediaChannel(): this is GuildMediaChannelRecord;
    isMediaPost(): boolean; // requires https://github.com/microsoft/TypeScript/issues/15048
    isMultiUserDM(): this is GroupDMChannelRecord;
    isNSFW(): boolean;
    isOwner(userId: string): boolean;
    isPrivate(): this is PrivateChannelRecord;
    isRoleSubscriptionTemplatePreviewChannel(): boolean;
    isScheduledForDeletion(): boolean;
    isSystemDM(): boolean;
    isThread(): this is ThreadChannelRecord;
    isVocal(): this is PrivateChannelRecord | GuildVocalChannelRecord | ThreadChannelRecord<ChannelTypes.PUBLIC_THREAD | ChannelTypes.PRIVATE_THREAD>;
    isVocalThread(): this is ThreadChannelRecord<ChannelTypes.PUBLIC_THREAD | ChannelTypes.PRIVATE_THREAD>;
    merge(collection: Partial<ChannelRecordOwnProperties<this>>): this;
    get nsfw(): boolean;
    get permissionOverwrites(): PermissionOverwriteMap;
    get position(): number;
    get rateLimitPerUser(): number;
    set<Key extends ChannelRecordOwnPropertyKeys>(key: Key, value: ChannelRecordOwnProperties<this>[Key]): this;
    toJS(): ChannelRecordOwnProperties<this>;
    get topic(): string;
    get userLimit(): number;

    application_id?: string | undefined;
    appliedTags?: string[] | undefined;
    availableTags?: ForumTag[] | undefined;
    bitrate_?: number | undefined;
    defaultAutoArchiveDuration?: number | undefined;
    defaultForumLayout?: FormLayout | undefined;
    defaultReactionEmoji?: {
        emojiId: string | null;
        emojiName: string | null;
    } | undefined;
    defaultSortOrder?: ThreadSortOrder | Nullish;
    defaultThreadRateLimitPerUser?: number | undefined;
    flags_: ChannelFlags;
    guild_id: string | null;
    icon?: string | Nullish;
    iconEmoji?: {
        id: string | null;
        name: string;
    } | undefined;
    id: string;
    isMessageRequest?: boolean | undefined;
    isMessageRequestTimestamp?: string | Nullish;
    isSpam?: boolean | undefined;
    lastMessageId: string | Nullish;
    lastPinTimestamp: string | Nullish;
    member?: ThreadMember | undefined;
    memberCount?: number | undefined;
    memberIdsPreview?: string[] | undefined;
    memberListId?: string | Nullish;
    messageCount?: number | undefined;
    name: string;
    nicks?: { [userId: string]: string; } | undefined;
    nsfw_?: boolean | undefined;
    originChannelId?: string | Nullish;
    ownerId?: string | undefined;
    parent_id?: string | Nullish;
    parentChannelThreadType?: ChannelTypes.GUILD_TEXT | ChannelTypes.GUILD_ANNOUNCEMENT | ChannelTypes.GUILD_FORUM | ChannelTypes.GUILD_MEDIA | undefined;
    permissionOverwrites_?: PermissionOverwriteMap | undefined;
    position_?: number | undefined;
    rateLimitPerUser_?: number | undefined;
    rawRecipients?: ChannelRecipient[] | undefined;
    recipients?: string[] | undefined;
    rtcRegion?: string | Nullish;
    safetyWarnings?: SafetyWarning[] | undefined;
    template?: string | undefined;
    themeColor?: number | Nullish;
    threadMetadata?: ThreadMetadata | undefined;
    topic_?: string | Nullish;
    totalMessageSent?: number | undefined;
    type: ChannelTypes;
    userLimit_?: number | undefined;
    version?: number | undefined;
    videoQualityMode?: VideoQualityMode | undefined;
    voiceBackgroundDisplay?: { type: VoiceCallBackgroundTypes.EMPTY; }
        | { type: VoiceCallBackgroundTypes.GRADIENT; resourceId: string; }
        | Nullish;
}

export abstract class GuildTextualChannelRecordBase extends ChannelRecordBase {
    constructor(channelProperties: Record<string, any>); // TEMP

    static fromServer(channelFromServer: Record<string, any>, guildId?: string | Nullish): GuildTextualChannelRecord; // TEMP

    application_id: undefined;
    appliedTags?: undefined;
    availableTags?: undefined;
    bitrate_?: undefined;
    defaultAutoArchiveDuration: ChannelRecordBase["defaultAutoArchiveDuration"];
    defaultForumLayout?: undefined;
    defaultReactionEmoji?: undefined;
    defaultSortOrder?: undefined;
    defaultThreadRateLimitPerUser: ChannelRecordBase["defaultThreadRateLimitPerUser"];
    icon?: undefined;
    iconEmoji: ChannelRecordBase["iconEmoji"];
    isMessageRequest?: undefined;
    isMessageRequestTimestamp?: undefined;
    isSpam?: undefined;
    lastMessageId: ChannelRecordBase["lastMessageId"];
    lastPinTimestamp: ChannelRecordBase["lastPinTimestamp"];
    member?: undefined;
    memberCount?: undefined;
    memberIdsPreview?: undefined;
    memberListId: ChannelRecordBase["memberListId"]; // TEMP
    messageCount?: undefined;
    nicks?: undefined;
    nsfw_: Defined<ChannelRecordBase["nsfw_"]>;
    originChannelId?: undefined;
    ownerId?: undefined;
    parent_id: ChannelRecordBase["parent_id"];
    parentChannelThreadType?: undefined;
    permissionOverwrites_: Defined<ChannelRecordBase["permissionOverwrites_"]>;
    position_: Defined<ChannelRecordBase["position_"]>;
    rateLimitPerUser_: Defined<ChannelRecordBase["rateLimitPerUser_"]>;
    rawRecipients?: undefined;
    recipients?: undefined;
    rtcRegion?: undefined;
    safetyWarnings?: undefined;
    template?: undefined;
    themeColor: ChannelRecordBase["themeColor"];
    threadMetadata?: undefined;
    topic_: ChannelRecordBase["topic_"];
    totalMessageSent?: undefined;
    type: ChannelTypes.GUILD_TEXT | ChannelTypes.GUILD_CATEGORY | ChannelTypes.GUILD_ANNOUNCEMENT | ChannelTypes.GUILD_STORE | ChannelTypes.GUILD_DIRECTORY;
    userLimit_?: undefined;
    version: ChannelRecordBase["version"];
    videoQualityMode?: undefined;
    voiceBackgroundDisplay?: undefined;
}

export class GuildTextChannelRecord extends GuildTextualChannelRecordBase {
    type: ChannelTypes.GUILD_TEXT;
}

export class GuildCategoryChannelRecord extends GuildTextualChannelRecordBase {
    defaultAutoArchiveDuration: undefined;
    defaultThreadRateLimitPerUser: undefined;
    lastMessageId: undefined;
    lastPinTimestamp: undefined;
    memberListId: undefined; // TEMP
    parent_id: Nullish;
    themeColor: undefined; // TEMP
    topic_: undefined;
    type: ChannelTypes.GUILD_CATEGORY;
}

export class GuildAnnouncementChannelRecord extends GuildTextualChannelRecordBase {
    type: ChannelTypes.GUILD_ANNOUNCEMENT;
}

export class GuildStoreChannelRecord extends GuildTextualChannelRecordBase {
    type: ChannelTypes.GUILD_STORE;
} // TEMP

export class GuildDirectoryChannelRecord extends GuildTextualChannelRecordBase {
    type: ChannelTypes.GUILD_DIRECTORY;
} // TEMP

export type GuildTextualChannelRecord = GuildTextChannelRecord | GuildCategoryChannelRecord | GuildAnnouncementChannelRecord | GuildStoreChannelRecord | GuildDirectoryChannelRecord;

export abstract class PrivateChannelRecordBase extends ChannelRecordBase {
    constructor(channelProperties: Record<string, any>); // TEMP

    static fromServer(channelFromServer: Record<string, any>): PrivateChannelRecord;
    static sortRecipients(recipients: ChannelRecipient[] | Nullish, channelId: string): string[];

    addRecipient(recipientUserId: string, nickname: string | undefined, currentUserId: string): this;
    getRecipientId(): string | undefined;
    removeRecipient(recipientUserId: string): this;

    application_id: ChannelRecordBase["application_id"];
    appliedTags?: undefined;
    availableTags?: undefined;
    bitrate_?: undefined;
    defaultAutoArchiveDuration?: undefined;
    defaultForumLayout?: undefined;
    defaultReactionEmoji?: undefined;
    defaultSortOrder?: undefined;
    defaultThreadRateLimitPerUser?: undefined;
    guild_id: null;
    icon: ChannelRecordBase["icon"];
    iconEmoji?: undefined;
    isMessageRequest: ChannelRecordBase["isMessageRequest"];
    isMessageRequestTimestamp: ChannelRecordBase["isMessageRequestTimestamp"];
    isSpam: Defined<ChannelRecordBase["isSpam"]>;
    lastMessageId: ChannelRecordBase["lastMessageId"];
    lastPinTimestamp: ChannelRecordBase["lastPinTimestamp"];
    member?: undefined;
    memberCount?: undefined;
    memberIdsPreview?: undefined;
    memberListId?: undefined;
    messageCount?: undefined;
    nicks: Defined<ChannelRecordBase["nicks"]>;
    nsfw_?: undefined;
    originChannelId?: undefined;
    ownerId: ChannelRecordBase["ownerId"];
    parent_id?: undefined;
    parentChannelThreadType?: undefined;
    permissionOverwrites_?: undefined;
    position_?: undefined;
    rateLimitPerUser_?: undefined;
    rawRecipients: Defined<ChannelRecordBase["rawRecipients"]>;
    recipients: Defined<ChannelRecordBase["recipients"]>;
    rtcRegion?: undefined;
    safetyWarnings: ChannelRecordBase["safetyWarnings"];
    template?: undefined;
    themeColor?: undefined;
    threadMetadata?: undefined;
    topic_?: undefined;
    totalMessageSent?: undefined;
    type: ChannelTypes.DM | ChannelTypes.GROUP_DM;
    userLimit_?: undefined;
    version?: undefined;
    videoQualityMode?: undefined;
    voiceBackgroundDisplay?: undefined;
}

export class DMChannelRecord extends PrivateChannelRecordBase {
    application_id: undefined;
    icon: undefined;
    name: "";
    ownerId: undefined;
    type: ChannelTypes.DM;
}

export class GroupDMChannelRecord extends PrivateChannelRecordBase {
    isMessageRequest: undefined;
    isMessageRequestTimestamp: undefined;
    ownerId: PrivateChannelRecordBase["ownerId"];
    type: ChannelTypes.GROUP_DM;
}

export type PrivateChannelRecord = DMChannelRecord | GroupDMChannelRecord;

export abstract class GuildVocalChannelRecordBase extends ChannelRecordBase {
    constructor(channelProperties: Record<string, any>); // TEMP

    static fromServer(channelFromServer: Record<string, any>, guildId?: string | Nullish): GuildVocalChannelRecord; // TEMP

    application_id: undefined;
    appliedTags?: undefined;
    availableTags?: undefined;
    bitrate_: Defined<ChannelRecordBase["bitrate_"]>;
    defaultAutoArchiveDuration?: undefined;
    defaultForumLayout?: undefined;
    defaultReactionEmoji?: undefined;
    defaultSortOrder?: undefined;
    defaultThreadRateLimitPerUser?: undefined;
    icon?: undefined;
    iconEmoji: ChannelRecordBase["iconEmoji"];
    isMessageRequest?: undefined;
    isMessageRequestTimestamp?: undefined;
    isSpam?: undefined;
    lastMessageId: ChannelRecordBase["lastMessageId"];
    lastPinTimestamp: undefined;
    member?: undefined;
    memberCount?: undefined;
    memberIdsPreview?: undefined;
    memberListId: ChannelRecordBase["memberListId"]; // TEMP
    messageCount?: undefined;
    nicks?: undefined;
    nsfw_: Defined<ChannelRecordBase["nsfw_"]>;
    originChannelId: ChannelRecordBase["originChannelId"]; // TEMP
    ownerId?: undefined;
    parent_id: ChannelRecordBase["parent_id"];
    parentChannelThreadType?: undefined;
    permissionOverwrites_: Defined<ChannelRecordBase["permissionOverwrites_"]>;
    position_: Defined<ChannelRecordBase["position_"]>;
    rateLimitPerUser_: Defined<ChannelRecordBase["rateLimitPerUser_"]>;
    rawRecipients?: undefined;
    recipients?: undefined;
    rtcRegion: Defined<ChannelRecordBase["rtcRegion"]>;
    safetyWarnings?: undefined;
    template?: undefined;
    themeColor: Nullish; // TEMP
    threadMetadata?: undefined;
    topic_: Nullish;
    totalMessageSent?: undefined;
    type: ChannelTypes.GUILD_VOICE | ChannelTypes.GUILD_STAGE_VOICE;
    userLimit_: Defined<ChannelRecordBase["userLimit_"]>;
    version: ChannelRecordBase["version"];
    videoQualityMode: ChannelRecordBase["videoQualityMode"];
    voiceBackgroundDisplay: Defined<ChannelRecordBase["voiceBackgroundDisplay"]>;
}

export class GuildVoiceChannelRecord extends GuildVocalChannelRecordBase {
    type: ChannelTypes.GUILD_VOICE;
}

export class GuildStageVoiceChannelRecord extends GuildVocalChannelRecordBase {
    type: ChannelTypes.GUILD_STAGE_VOICE;
}

export type GuildVocalChannelRecord = GuildVoiceChannelRecord | GuildStageVoiceChannelRecord;

type ThreadChannelType = ChannelTypes.ANNOUNCEMENT_THREAD | ChannelTypes.PUBLIC_THREAD | ChannelTypes.PRIVATE_THREAD;

export class ThreadChannelRecord<ChannelType extends ThreadChannelType = ThreadChannelType> extends ChannelRecordBase {
    constructor(channelProperties: Record<string, any>); // TEMP

    static fromServer(channelFromServer: Record<string, any>, guildId?: string | Nullish): ThreadChannelRecord; // TEMP

    application_id?: undefined;
    appliedTags: Defined<ChannelRecordBase["appliedTags"]>;
    availableTags?: undefined;
    bitrate_: undefined;
    defaultAutoArchiveDuration?: undefined;
    defaultForumLayout?: undefined;
    defaultReactionEmoji?: undefined;
    defaultSortOrder?: undefined;
    defaultThreadRateLimitPerUser?: undefined;
    icon?: undefined;
    iconEmoji?: undefined;
    isMessageRequest?: undefined;
    isMessageRequestTimestamp?: undefined;
    isSpam?: undefined;
    lastMessageId: ChannelRecordBase["lastMessageId"];
    lastPinTimestamp: ChannelRecordBase["lastMessageId"];
    member: ChannelRecordBase["member"];
    memberCount: Defined<ChannelRecordBase["memberCount"]>;
    memberIdsPreview: Defined<ChannelRecordBase["memberIdsPreview"]>;
    memberListId?: undefined;
    messageCount: Defined<ChannelRecordBase["messageCount"]>;
    nicks?: undefined;
    nsfw_: Defined<ChannelRecordBase["nsfw_"]>;
    originChannelId?: undefined;
    ownerId: Defined<ChannelRecordBase["ownerId"]>;
    parentChannelThreadType: Defined<ChannelRecordBase["parentChannelThreadType"]>;
    parent_id: NonNullable<ChannelRecordBase["parent_id"]>;
    permissionOverwrites_?: undefined;
    position_?: undefined;
    rateLimitPerUser_: Defined<ChannelRecordBase["rateLimitPerUser_"]>;
    rawRecipients?: undefined;
    recipients?: undefined;
    rtcRegion: undefined;
    safetyWarnings?: undefined;
    template?: undefined;
    themeColor?: undefined;
    threadMetadata: ChannelRecordBase["threadMetadata"];
    topic_?: undefined;
    totalMessageSent: ChannelRecordBase["rateLimitPerUser_"];
    type: ChannelType;
    userLimit_: undefined;
    version?: undefined;
    videoQualityMode: undefined;
    voiceBackgroundDisplay?: undefined;
}

export abstract class ForumChannelRecordBase extends ChannelRecordBase {
    constructor(channelProperties: Record<string, any>); // TEMP

    static fromServer(channelFromServer: Record<string, any>, guildId?: string | Nullish): ForumChannelRecord; // TEMP

    application_id?: undefined;
    appliedTags?: undefined;
    availableTags: Defined<ChannelRecordBase["availableTags"]>;
    bitrate_?: undefined;
    defaultAutoArchiveDuration: ChannelRecordBase["defaultAutoArchiveDuration"];
    defaultForumLayout: ChannelRecordBase["defaultForumLayout"];
    defaultReactionEmoji: ChannelRecordBase["defaultReactionEmoji"];
    defaultSortOrder: ChannelRecordBase["defaultSortOrder"];
    defaultThreadRateLimitPerUser: ChannelRecordBase["defaultThreadRateLimitPerUser"];
    icon?: undefined;
    iconEmoji: ChannelRecordBase["iconEmoji"];
    isMessageRequest?: undefined;
    isMessageRequestTimestamp?: undefined;
    isSpam?: undefined;
    lastMessageId: ChannelRecordBase["lastMessageId"];
    lastPinTimestamp: ChannelRecordBase["lastPinTimestamp"];
    member?: undefined;
    memberCount?: undefined;
    memberIdsPreview?: undefined;
    memberListId: ChannelRecordBase["memberListId"]; // TEMP
    messageCount?: undefined;
    nicks?: undefined;
    nsfw_: Defined<ChannelRecordBase["nsfw_"]>;
    originChannelId?: undefined;
    ownerId?: undefined;
    parentChannelThreadType?: undefined;
    parent_id: NonNullable<ChannelRecordBase["parent_id"]>;
    permissionOverwrites_: Defined<ChannelRecordBase["permissionOverwrites_"]>;
    position_: Defined<ChannelRecordBase["position_"]>;
    rateLimitPerUser_: Defined<ChannelRecordBase["rateLimitPerUser_"]>;
    rawRecipients?: undefined;
    recipients?: undefined;
    rtcRegion?: undefined;
    safetyWarnings?: undefined;
    template: Defined<ChannelRecordBase["template"]>;
    themeColor: ChannelRecordBase["themeColor"];
    threadMetadata?: undefined;
    topic_: ChannelRecordBase["topic_"];
    totalMessageSent?: undefined;
    type: ChannelTypes.GUILD_FORUM | ChannelTypes.GUILD_MEDIA;
    userLimit_?: undefined;
    version: ChannelRecordBase["version"];
    videoQualityMode?: undefined;
    voiceBackgroundDisplay?: undefined;
}

export class GuildForumChannelRecord extends ForumChannelRecordBase {
    type: ChannelTypes.GUILD_FORUM;
}

export class GuildMediaChannelRecord extends ForumChannelRecordBase {
    type: ChannelTypes.GUILD_MEDIA;
}

export type ForumChannelRecord = GuildForumChannelRecord | GuildMediaChannelRecord;

export class UnknownChannelRecord extends ChannelRecordBase {
    constructor(channelProperties: Record<string, any>); // TEMP

    static fromServer(channelFromServer: Record<string, any>, guildId?: string | Nullish): UnknownChannelRecord; // TEMP

    application_id: ChannelRecordBase["application_id"];
    appliedTags: ChannelRecordBase["appliedTags"];
    availableTags: ChannelRecordBase["availableTags"];
    bitrate_: ChannelRecordBase["bitrate_"];
    defaultAutoArchiveDuration: ChannelRecordBase["defaultAutoArchiveDuration"];
    defaultForumLayout: ChannelRecordBase["defaultForumLayout"];
    defaultReactionEmoji: ChannelRecordBase["defaultReactionEmoji"];
    defaultSortOrder: ChannelRecordBase["defaultSortOrder"];
    defaultThreadRateLimitPerUser: ChannelRecordBase["defaultThreadRateLimitPerUser"];
    icon: ChannelRecordBase["icon"];
    iconEmoji: ChannelRecordBase["iconEmoji"];
    isMessageRequest: ChannelRecordBase["isMessageRequest"];
    isMessageRequestTimestamp: ChannelRecordBase["isMessageRequestTimestamp"];
    isSpam: ChannelRecordBase["isSpam"];
    lastMessageId: ChannelRecordBase["lastMessageId"];
    lastPinTimestamp: ChannelRecordBase["lastPinTimestamp"];
    member: ChannelRecordBase["member"];
    memberCount: ChannelRecordBase["memberCount"];
    memberIdsPreview: ChannelRecordBase["memberIdsPreview"];
    memberListId: ChannelRecordBase["memberListId"];
    messageCount: ChannelRecordBase["messageCount"];
    nicks: ChannelRecordBase["nicks"];
    nsfw_: ChannelRecordBase["nsfw_"];
    originChannelId: ChannelRecordBase["originChannelId"];
    ownerId: ChannelRecordBase["ownerId"];
    parent_id: ChannelRecordBase["parent_id"];
    parentChannelThreadType: undefined;
    permissionOverwrites_: Defined<ChannelRecordBase["permissionOverwrites_"]>;
    position_: ChannelRecordBase["position_"];
    rateLimitPerUser_: ChannelRecordBase["rateLimitPerUser_"];
    rawRecipients: Defined<ChannelRecordBase["rawRecipients"]>;
    recipients: Defined<ChannelRecordBase["recipients"]>;
    rtcRegion: ChannelRecordBase["rtcRegion"];
    safetyWarnings: ChannelRecordBase["safetyWarnings"];
    template: ChannelRecordBase["template"];
    themeColor: ChannelRecordBase["themeColor"];
    threadMetadata: ChannelRecordBase["threadMetadata"];
    topic_: ChannelRecordBase["topic_"];
    totalMessageSent: ChannelRecordBase["totalMessageSent"];
    type: ChannelTypes.UNKNOWN;
    userLimit_: ChannelRecordBase["userLimit_"];
    version: ChannelRecordBase["version"];
    videoQualityMode: ChannelRecordBase["videoQualityMode"];
}

export type GuildChannelRecord = GuildTextualChannelRecord | GuildVocalChannelRecord | ForumChannelRecord;

export type ChannelRecord = GuildChannelRecord | PrivateChannelRecord | ThreadChannelRecord;

type ChannelStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC" | "CACHE_LOADED" | "CACHE_LOADED_LAZY" | "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_RECIPIENT_ADD" | "CHANNEL_RECIPIENT_REMOVE" | "CHANNEL_UPDATES" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_FEED_FETCH_SUCCESS" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_CHANNELS" | "LOAD_MESSAGES_AROUND_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_THREADS_SUCCESS" | "LOGOUT" | "MOD_VIEW_SEARCH_FINISH" | "OVERLAY_INITIALIZE" | "SEARCH_FINISH" | "THREAD_CREATE" | "THREAD_DELETE" | "THREAD_LIST_SYNC" | "THREAD_UPDATE">;

export class ChannelStore<Action extends FluxAction = ChannelStoreAction> extends FluxStore<Action> {
    static displayName: "ChannelStore";

    getAllThreadsForParent(channelId: string): ThreadChannelRecord[];
    getBasicChannel(channelId?: string | Nullish): ChannelRecord | null; // TEMP
    getChannel(channelId?: string | Nullish): ChannelRecord | undefined;
    getChannelIds(guildId?: string | Nullish): string[];
    getDebugInfo(): {
        loadedGuildIds: string[];
        pendingGuildLoads: any[]; // TEMP
        guildSizes: string[];
    };
    getDMFromUserId(userId?: string | Nullish): string | undefined;
    getDMUserIds(): string[];
    getGuildChannelsVersion(guildId: string): number;
    getInitialOverlayState(): { [channelId: string]: ChannelRecord; };
    getMutableBasicGuildChannelsForGuild(guildId: string): { [channelId: string]: GuildChannelRecord; }; // TEMP
    getMutableDMsByUserIds(): { [userId: string]: string; };
    getMutableGuildChannelsForGuild(guildId: string): { [channelId: string]: GuildChannelRecord; };
    getMutablePrivateChannels(): { [channelId: string]: PrivateChannelRecord; };
    getPrivateChannelsVersion(): number;
    getSortedPrivateChannels(): PrivateChannelRecord[];
    hasChannel(channelId: string): boolean;
    initialize(): void;
    loadAllGuildAndPrivateChannelsFromDisk(): { [channelId: string]: GuildChannelRecord | PrivateChannelRecord; };
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
    type: 1;
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
    type: 0;
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
        // @ts-expect-error: TODO
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
    AUTOMOD_QUARANTINED_CLAN_TAG = 1 << 10,
}

export interface GuildMember {
    avatar: string | null;
    avatarDecoration: AvatarDecorationData | undefined;
    colorRoleId: string | undefined;
    colorString: string | undefined;
    communicationDisabledUntil: string | null;
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

type GuildMemberStoreAction = ExtractAction<FluxAction, "CACHE_LOADED" | "CLEAR_PENDING_CHANNEL_AND_ROLE_UPDATES" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_MEMBERS_CHUNK_BATCH" | "GUILD_MEMBER_ADD" | "GUILD_MEMBER_PROFILE_UPDATE" | "GUILD_MEMBER_REMOVE" | "GUILD_MEMBER_UPDATE" | "GUILD_MEMBER_UPDATE_LOCAL" | "GUILD_ROLE_DELETE" | "GUILD_ROLE_MEMBER_ADD" | "GUILD_ROLE_MEMBER_REMOVE" | "GUILD_ROLE_UPDATE" | "IMPERSONATE_STOP" | "IMPERSONATE_UPDATE" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_FORUM_POSTS" | "LOAD_MESSAGES_AROUND_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_PINNED_MESSAGES_SUCCESS" | "LOAD_RECENT_MENTIONS_SUCCESS" | "LOCAL_MESSAGES_LOADED" | "MEMBER_SAFETY_GUILD_MEMBER_SEARCH_SUCCESS" | "MESSAGE_CREATE" | "MESSAGE_UPDATE" | "MOD_VIEW_SEARCH_FINISH" | "OVERLAY_INITIALIZE" | "PASSIVE_UPDATE_V2" | "SEARCH_FINISH" | "THREAD_MEMBERS_UPDATE" | "THREAD_MEMBER_LIST_UPDATE">;

export class GuildMemberStore<Action extends FluxAction = GuildMemberStoreAction> extends FluxStore<Action> {
    static displayName: "GuildMemberStore";

    getCommunicationDisabledUserMap(): { [userId: string]: string; };
    getCommunicationDisabledVersion(): number;
    getMember(guildId: string, userId: string): GuildMember | null;
    getMemberIds(guildId?: string | Nullish): string[];
    getMemberRoleWithPendingUpdates(guildId: string, userId: string): string[];
    getMembers(guildId?: string | Nullish): GuildMember[];
    getMemberVersion(): number;
    getMutableAllGuildsAndMembers(): { [guildId: string]: { [userId: string]: GuildMember; }; };
    getNick(guildId?: string | Nullish, userId?: string | Nullish): string | null;
    getNicknameGuildsMapping(userId: string): { [nickname: string]: string[]; };
    getNicknames(userId: string): string[];
    getPendingRoleUpdates(guildId: string): {
        added: string[]
        removed: string[]
    };
    getSelfMember(guildId: string): GuildMember | Nullish;
    getTrueMember(guildId: string, userId: string): GuildMember | Nullish;
    initialize(): void;
    isCurrentUserGuest(guildId?: string | Nullish): boolean;
    isGuestOrLurker(guildId?: string | Nullish, userId?: string | Nullish): boolean;
    isMember(guildId?: string | Nullish, userId?: string | Nullish): boolean;
    memberOf(userId: string): string[];
}

export const enum RoleFlags {
    IN_PROMPT = 1,
}

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
    permissions: /* Permissions */ bigint;
    position: number;
    tags: {
        available_for_purchase?: null;
        bot_id?: string;
        guild_connections?: null;
        integration_id?: string;
        premium_subscriber?: null;
        subscription_listing_id?: string;
    };
    unicodeEmoji: string | null;
}

interface IconSource {
    uri: string;
}

export const enum ClanBadgeKind {
    SWORD = 0,
    WATER_DROP = 1,
    SKULL = 2,
    TOADSTOOL = 3,
    MOON = 4,
    LIGHTNING = 5,
    LEAF = 6,
    HEART = 7,
    FIRE = 8,
    COMPASS = 9,
    CROSSHAIRS = 10,
    FLOWER = 11,
    FORCE = 12,
    GEM = 13,
    LAVA = 14,
    PSYCHIC = 15,
    SMOKE = 16,
    SNOW = 17,
    SOUND = 18,
    SUN = 19,
    WIND = 20,
}

export const enum ClanBannerKind {
    NIGHT_SKY = 0,
    CASTLE = 1,
    WORLD_MAP = 2,
    SEA_FOAM = 3,
    WARP_TUNNEL = 4,
    HOUSE = 5,
    HEIGHTMAP = 6,
    MESH = 7,
    SPATTER = 8,
}

export const enum ClanPlaystyles {
    NONE = 0,
    SOCIAL = 1,
    CASUAL = 2,
    COMPETITIVE = 3,
    CREATIVE = 4,
    VERY_HARDCORE = 5,
}

export interface Clan {
    badge: {
        badgeKind: ClanBadgeKind;
        primaryColor: string;
        secondaryColor: string;
    };
    banner: ClanBannerKind;
    bannerHash: string | null;
    branding: {
        primaryColor: string;
        secondaryColor: string;
    };
    description: string | null;
    games: string[];
    icon: string | null;
    id: string;
    memberCount: number;
    name: string;
    playstyle: ClanPlaystyles;
    tag: string;
    traits: string[];
    wildcardDescriptors: string[];
}

export const enum UserNotificationSettings {
    ALL_MESSAGES = 0,
    ONLY_MENTIONS = 1,
    NO_MESSAGES = 2,
    NULL = 3,
}

export const enum GuildExplicitContentFilterTypes {
    DISABLED = 0,
    MEMBERS_WITHOUT_ROLES = 1,
    ALL_MEMBERS = 2,
}

export const enum GuildFeatures {
    ANIMATED_BANNER = "ANIMATED_BANNER",
    ANIMATED_ICON = "ANIMATED_ICON",
    AUTOMOD_TRIGGER_USER_PROFILE = "AUTOMOD_TRIGGER_USER_PROFILE",
    AUTO_MODERATION = "AUTO_MODERATION",
    BANNER = "BANNER",
    BURST_REACTIONS = "BURST_REACTIONS",
    CHANNEL_ICON_EMOJIS_GENERATED = "CHANNEL_ICON_EMOJIS_GENERATED",
    CLAN = "CLAN",
    CLAN_PILOT_GENSHIN = "CLAN_PILOT_GENSHIN",
    CLAN_PILOT_VALORANT = "CLAN_PILOT_VALORANT",
    CLYDE_DISABLED = "CLYDE_DISABLED",
    CLYDE_ENABLED = "CLYDE_ENABLED",
    COMMERCE = "COMMERCE",
    COMMUNITY = "COMMUNITY",
    CREATOR_MONETIZABLE = "CREATOR_MONETIZABLE",
    CREATOR_MONETIZABLE_DISABLED = "CREATOR_MONETIZABLE_DISABLED",
    CREATOR_MONETIZABLE_PENDING_NEW_OWNER_ONBOARDING = "CREATOR_MONETIZABLE_PENDING_NEW_OWNER_ONBOARDING",
    CREATOR_MONETIZABLE_PROVISIONAL = "CREATOR_MONETIZABLE_PROVISIONAL",
    CREATOR_MONETIZABLE_RESTRICTED = "CREATOR_MONETIZABLE_RESTRICTED",
    CREATOR_MONETIZABLE_WHITEGLOVE = "CREATOR_MONETIZABLE_WHITEGLOVE",
    CREATOR_STORE_PAGE = "CREATOR_STORE_PAGE",
    DISCOVERABLE = "DISCOVERABLE",
    ENABLED_DISCOVERABLE_BEFORE = "ENABLED_DISCOVERABLE_BEFORE",
    ENABLED_MODERATION_EXPERIENCE_FOR_NON_COMMUNITY = "ENABLED_MODERATION_EXPERIENCE_FOR_NON_COMMUNITY",
    EXPOSED_TO_ACTIVITIES_WTP_EXPERIMENT = "EXPOSED_TO_ACTIVITIES_WTP_EXPERIMENT",
    FEATURABLE = "FEATURABLE",
    GENSHIN_L30 = "GENSHIN_L30",
    GUILD_HOME_DEPRECATION_OVERRIDE = "GUILD_HOME_DEPRECATION_OVERRIDE",
    GUILD_HOME_OVERRIDE = "GUILD_HOME_OVERRIDE",
    GUILD_HOME_TEST = "GUILD_HOME_TEST",
    GUILD_ONBOARDING = "GUILD_ONBOARDING",
    GUILD_ONBOARDING_EVER_ENABLED = "GUILD_ONBOARDING_EVER_ENABLED",
    GUILD_ONBOARDING_HAS_PROMPTS = "GUILD_ONBOARDING_HAS_PROMPTS",
    GUILD_PRODUCTS_ALLOW_ARCHIVED_FILE = "GUILD_PRODUCTS_ALLOW_ARCHIVED_FILE",
    GUILD_SERVER_GUIDE = "GUILD_SERVER_GUIDE",
    GUILD_WEB_PAGE_VANITY_URL = "GUILD_WEB_PAGE_VANITY_URL",
    HAS_DIRECTORY_ENTRY = "HAS_DIRECTORY_ENTRY",
    HUB = "HUB",
    INTERNAL_EMPLOYEE_ONLY = "INTERNAL_EMPLOYEE_ONLY",
    INVITES_DISABLED = "INVITES_DISABLED",
    INVITE_SPLASH = "INVITE_SPLASH",
    LINKED_TO_HUB = "LINKED_TO_HUB",
    MEMBER_VERIFICATION_GATE_ENABLED = "MEMBER_VERIFICATION_GATE_ENABLED",
    MORE_EMOJI = "MORE_EMOJI",
    MORE_STICKERS = "MORE_STICKERS",
    NEWS = "NEWS",
    NEW_THREAD_PERMISSIONS = "NEW_THREAD_PERMISSIONS",
    NON_COMMUNITY_RAID_ALERTS = "NON_COMMUNITY_RAID_ALERTS",
    PARTNERED = "PARTNERED",
    PREVIEW_ENABLED = "PREVIEW_ENABLED",
    PRODUCTS_AVAILABLE_FOR_PURCHASE = "PRODUCTS_AVAILABLE_FOR_PURCHASE",
    RAID_ALERTS_DISABLED = "RAID_ALERTS_DISABLED",
    ROLE_ICONS = "ROLE_ICONS",
    ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE = "ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE",
    ROLE_SUBSCRIPTIONS_ENABLED = "ROLE_SUBSCRIPTIONS_ENABLED",
    SHARD = "SHARD",
    SOUNDBOARD = "SOUNDBOARD",
    SUMMARIES_ENABLED_BY_USER = "SUMMARIES_ENABLED_BY_USER",
    SUMMARIES_ENABLED_GA = "SUMMARIES_ENABLED_GA",
    SUMMARIES_OPT_OUT_EXPERIENCE = "SUMMARIES_OPT_OUT_EXPERIENCE",
    TEXT_IN_STAGE_ENABLED = "TEXT_IN_STAGE_ENABLED",
    TEXT_IN_VOICE_ENABLED = "TEXT_IN_VOICE_ENABLED",
    THREADS_ENABLED = "THREADS_ENABLED",
    THREADS_ENABLED_TESTING = "THREADS_ENABLED_TESTING",
    VALORANT_L30 = "VALORANT_L30",
    VANITY_URL = "VANITY_URL",
    VERIFIED = "VERIFIED",
    VIP_REGIONS = "VIP_REGIONS",
    WELCOME_SCREEN_ENABLED = "WELCOME_SCREEN_ENABLED",
}

export const enum GuildHubTypes {
    DEFAULT = 0,
    HIGH_SCHOOL = 1,
    COLLEGE = 2,
}

export const enum MFALevels {
    NONE = 0,
    ELEVATED = 1,
}

export const enum GuildNSFWContentLevel {
    DEFAULT = 0,
    EXPLICIT = 1,
    SAFE = 2,
    AGE_RESTRICTED = 3,
}

export const enum BoostedGuildTiers {
    NONE = 0,
    TIER_1 = 1,
    TIER_2 = 2,
    TIER_3 = 3,
}

export const enum SystemChannelFlags {
    SUPPRESS_JOIN_NOTIFICATIONS = 1 << 0,
    SUPPRESS_PREMIUM_SUBSCRIPTIONS = 1 << 1,
    SUPPRESS_GUILD_REMINDER_NOTIFICATIONS = 1 << 2,
    SUPPRESS_JOIN_NOTIFICATION_REPLIES = 1 << 3,
    SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATIONS = 1 << 4,
    SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATION_REPLIES = 1 << 5,
    SUPPRESS_CHANNEL_PROMPT_DEADCHAT = 1 << 7,
}

export const enum VerificationLevels {
    NONE = 0,
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    VERY_HIGH = 4,
}

type GuildRecordOwnProperties = Pick<GuildRecord, "afkChannelId" | "afkTimeout" | "application_id" | "banner" | "clan" | "defaultMessageNotifications" | "description" | "discoverySplash" | "explicitContentFilter" | "features" | "homeHeader" | "hubType" | "icon" | "id" | "joinedAt" | "latestOnboardingQuestionId" | "maxMembers" | "maxStageVideoChannelUsers" | "maxVideoChannelUsers" | "mfaLevel" | "name" | "nsfwLevel" | "ownerId" | "preferredLocale" | "premiumProgressBarEnabled" | "premiumSubscriberCount" | "premiumTier" | "publicUpdatesChannelId" | "rulesChannelId" | "safetyAlertsChannelId" | "splash" | "systemChannelFlags" | "systemChannelId" | "vanityURLCode" | "verificationLevel">;

export class GuildRecord<
    OwnProperties extends GuildRecordOwnProperties = GuildRecordOwnProperties
> extends ImmutableRecord<OwnProperties> {
    constructor(guildFromServer: Record<string, any>); // TEMP

    get acronym(): string;
    canHaveRaidActivityAlerts(): boolean;
    getApplicationId(): string | null;
    getEveryoneRoleId(): string;
    getIconSource(iconSize?: number | undefined, canAnimate?: boolean | undefined): IconSource;
    getIconURL(iconSize?: number | undefined, canAnimate?: boolean | undefined): string;
    getMaxEmojiSlots(): number;
    getMaxRoleSubscriptionEmojiSlots(): number;
    getMaxSoundboardSlots(): number;
    getSafetyAlertsChannelId(): string | null;
    isCommunity(): boolean;
    isLurker(): boolean;
    isNew(): boolean;
    isOwner(userOrUserId?: UserRecord | string | Nullish): boolean;
    isOwnerWithRequiredMfaLevel(userOrUserId?: UserRecord | string | Nullish): boolean;
    hasCommunityInfoSubheader(): boolean;
    hasFeature(guildFeature: GuildFeatures): boolean;
    hasVerificationGate(): boolean;
    updateJoinedAt(joinedAt: Date | string): this;

    afkChannelId: string | null;
    afkTimeout: number;
    application_id: string | null;
    banner: string | null;
    clan: Clan | null;
    defaultMessageNotifications: UserNotificationSettings;
    description: string | null;
    discoverySplash: string | null;
    explicitContentFilter: GuildExplicitContentFilterTypes;
    features: Set<GuildFeatures>;
    homeHeader: string | null;
    hubType: GuildHubTypes | null;
    icon: string | null;
    id: string;
    joinedAt: Date;
    latestOnboardingQuestionId: string | null;
    maxMembers: number;
    maxStageVideoChannelUsers: number;
    maxVideoChannelUsers: number;
    mfaLevel: MFALevels;
    name: string;
    nsfwLevel: GuildNSFWContentLevel;
    ownerId: string | null;
    preferredLocale: string;
    premiumProgressBarEnabled: boolean;
    premiumSubscriberCount: number;
    premiumTier: BoostedGuildTiers;
    publicUpdatesChannelId: string | null;
    rulesChannelId: string | null;
    safetyAlertsChannelId: string | null;
    splash: string | null;
    systemChannelFlags: SystemChannelFlags;
    systemChannelId: string | null;
    vanityURLCode: string | null;
    verificationLevel: VerificationLevels;
}

type GuildStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC" | "CACHE_LOADED" | "CACHE_LOADED_LAZY" | "CONNECTION_OPEN" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_GEO_RESTRICTED" | "GUILD_MEMBER_ADD" | "GUILD_ROLE_CREATE" | "GUILD_ROLE_DELETE" | "GUILD_ROLE_UPDATE" | "GUILD_SETTINGS_SUBMIT_SUCCESS" | "GUILD_UPDATE" | "OVERLAY_INITIALIZE">;

export class GuildStore<Action extends FluxAction = GuildStoreAction> extends FluxStore<Action> {
    static displayName: "GuildStore";

    getAllGuildsRoles(): { [guildId: string]: { [roleId: string]: Role; }; };
    getGeoRestrictedGuilds(): { [guildId: string]: GuildRecord; };
    getGuild(guildId?: string | Nullish): GuildRecord | undefined;
    getGuildCount(): number;
    getGuildIds(): string[];
    getGuilds(): { [guildId: string]: GuildRecord; };
    getRole(guildId: string, roleId: string): Role | undefined;
    getRoles(guildId: string): { [roleId: string]: Role; };
    isLoaded(): boolean;
}

export const enum MessageAttachmentFlags {
    IS_CLIP = 1 << 0,
    IS_THUMBNAIL = 1 << 1,
    IS_REMIX = 1 << 2,
    IS_SPOILER = 1 << 3,
    CONTAINS_EXPLICIT_MEDIA = 1 << 4,
}

export interface MessageAttachment {
    content_scan_version?: number;
    content_type?: string;
    description?: string;
    duration_secs?: number;
    ephemeral?: boolean;
    filename: string;
    flags?: MessageAttachmentFlags;
    height?: number | null;
    id: string;
    placeholder?: string;
    placeholder_version?: number;
    proxy_url: string;
    size: number;
    spoiler: boolean;
    url: string;
    waveform?: string;
    width?: number | null;
}

export interface MessageCall {
    duration: Duration | null;
    endedTimestamp: Moment | null;
    participants: string[];
}

export const enum CodedLinkType {
    ACTIVITY_BOOKMARK = "ACTIVITY_BOOKMARK",
    APP_DIRECTORY_PROFILE = "APP_DIRECTORY_PROFILE",
    BUILD_OVERRIDE = "BUILD_OVERRIDE",
    CHANNEL_LINK = "CHANNEL_LINK",
    EMBEDDED_ACTIVITY_INVITE = "EMBEDDED_ACTIVITY_INVITE",
    EVENT = "EVENT",
    GUILD_PRODUCT = "GUILD_PRODUCT",
    INVITE = "INVITE",
    MANUAL_BUILD_OVERRIDE = "MANUAL_BUILD_OVERRIDE",
    QUESTS_EMBED = "QUESTS_EMBED",
    SERVER_SHOP = "SERVER_SHOP",
    TEMPLATE = "TEMPLATE",
}

export interface CodedLink {
    code: string;
    type: CodedLinkType;
}

export interface MessageComponentEmoji {
    animated: boolean | undefined;
    id: string | undefined;
    src: string | undefined;
    name: string | undefined;
}

// Original name: ComponentType, renamed to avoid conflict with ComponentType from React
export const enum MessageComponentType {
    ACTION_ROW = 1,
    BUTTON = 2,
    STRING_SELECT = 3,
    INPUT_TEXT = 4,
    USER_SELECT = 5,
    ROLE_SELECT = 6,
    MENTIONABLE_SELECT = 7,
    CHANNEL_SELECT = 8,
    TEXT = 10,
    MEDIA_GALLERY = 12,
    SEPARATOR = 14,
}

export interface MessageActionRowComponent {
    type: MessageComponentType.ACTION_ROW;
    id: string;
    components: Exclude<MessageComponent, MessageActionRowComponent>[];
}

export const enum ButtonStyle {
    PRIMARY = 1,
    SECONDARY = 2,
    SUCCESS = 3,
    DESTRUCTIVE = 4,
    LINK = 5,
    PREMIUM = 6,
}

// TODO: Must have one of either `customId` or `url`, but never both.
// If a button has `url` it must have the `Link` button style.
export interface MessageButtonComponent {
    customId: string | undefined;
    disabled: boolean | undefined;
    emoji: MessageComponentEmoji | undefined;
    id: string;
    label: string | undefined;
    style: ButtonStyle;
    type: MessageComponentType.BUTTON;
    url: string | undefined;
}

export const enum SelectOptionType {
    STRING = 1,
    USER = 2,
    ROLE = 3,
    CHANNEL = 4,
    GUILD = 5,
}

export interface SelectMenuOption<OptionType extends SelectOptionType = SelectOptionType> {
    type: OptionType;
    label: string;
    value: string;
    default: boolean | undefined;
    description: string | undefined;
    emoji: MessageComponentEmoji | undefined;
}

export interface MessageStringSelectComponent {
    customId: string;
    disabled: boolean | undefined;
    id: string;
    maxValues: number | undefined;
    minValues: number | undefined;
    options: SelectMenuOption<SelectOptionType.STRING>[];
    placeholder: string;
    type: MessageComponentType.STRING_SELECT;
}

export const enum TextComponentStyle {
    SMALL = 1,
    PARAGRAPH = 2,
}

export interface MessageTextInputComponent {
    customId: string;
    disabled: boolean | undefined;
    id: string;
    label: string;
    maxLength: number | undefined;
    minLength: number | undefined;
    placeholder: string | undefined;
    required: boolean;
    style: TextComponentStyle;
    type: MessageComponentType.INPUT_TEXT;
    value: string | undefined;
}

export const enum SnowflakeSelectDefaultValueTypes {
    CHANNEL = "channel",
    ROLE = "role",
    USER = "user",
}

export interface SelectMenuDefaultValue<DefaultValueType extends SnowflakeSelectDefaultValueTypes = SnowflakeSelectDefaultValueTypes> {
    id: string;
    type: DefaultValueType;
}

export interface MessageUserSelectComponent {
    customId: string;
    defaultValues: SelectMenuDefaultValue<SnowflakeSelectDefaultValueTypes.USER>[];
    disabled: boolean | undefined;
    id: string;
    maxValues: number | undefined;
    minValues: number | undefined;
    placeholder: string;
    type: MessageComponentType.USER_SELECT;
}

export interface MessageRoleSelectComponent {
    customId: string;
    defaultValues: SelectMenuDefaultValue<SnowflakeSelectDefaultValueTypes.ROLE>[];
    disabled: boolean | undefined;
    id: string;
    maxValues: number | undefined;
    minValues: number | undefined;
    placeholder: string;
    type: MessageComponentType.ROLE_SELECT;
}

export interface MessageMentionableSelectComponent {
    customId: string;
    defaultValues: SelectMenuDefaultValue<SnowflakeSelectDefaultValueTypes.ROLE | SnowflakeSelectDefaultValueTypes.USER>[];
    disabled: boolean | undefined;
    id: string;
    maxValues: number | undefined;
    minValues: number | undefined;
    placeholder: string;
    type: MessageComponentType.MENTIONABLE_SELECT;
}

export interface MessageChannelSelectComponent {
    channelTypes: ChannelTypes[] | undefined;
    customId: string;
    defaultValues: SelectMenuDefaultValue<SnowflakeSelectDefaultValueTypes.CHANNEL>[];
    disabled: boolean | undefined;
    id: string;
    maxValues: number | undefined;
    minValues: number | undefined;
    placeholder: string;
    type: MessageComponentType.CHANNEL_SELECT;
}

export interface MessageTextComponent {
    content: string | undefined;
    id: string;
    type: MessageComponentType.TEXT;
}

export const enum ContentScanFlags {
    EXPLICIT = 1,
}

export interface MediaItem {
    contentScanMetadata: {
        version: number | undefined;
        contentScanFlags: ContentScanFlags | undefined;
    } | undefined;
    contentType: string | undefined;
    height: number | Nullish;
    placeholder: string | undefined;
    placeholderVersion: number | undefined;
    proxyUrl: string;
    url: string;
    width: number | Nullish;
}

export interface MessageMediaGalleryComponent {
    id: string;
    items: {
        media: MediaItem;
        description: string | undefined;
        spoiler: boolean;
    }[];
    type: MessageComponentType.MEDIA_GALLERY;
}

export const enum SeparatorSpacingSize {
    SMALL = 1,
    LARGE = 2,
}

export interface MessageSeparatorComponent {
    divider: boolean;
    id: string;
    spacing: SeparatorSpacingSize;
    type: MessageComponentType.SEPARATOR;
}

export type MessageComponent = MessageActionRowComponent | MessageButtonComponent | MessageStringSelectComponent | MessageTextInputComponent | MessageUserSelectComponent | MessageRoleSelectComponent | MessageMentionableSelectComponent | MessageChannelSelectComponent | MessageTextComponent | MessageMediaGalleryComponent | MessageSeparatorComponent;

export interface MessageEmbedAuthor {
    iconProxyURL: string | undefined;
    iconURL: string | undefined;
    name: string;
    url: string | undefined;
}

export interface MessageEmbedField {
    inline: boolean | undefined;
    rawName: string;
    rawValue: string;
}

export const enum MessageEmbedFlags {
    CONTAINS_EXPLICIT_MEDIA = 1 << 4,
}

export interface MessageEmbedFooter {
    iconProxyURL: string | undefined;
    iconURL: string | undefined;
    text: string;
}

export interface MessageEmbedImage {
    height: number | undefined;
    placeholder: string | undefined;
    placeholderVersion: number | undefined;
    proxyURL: string | undefined;
    url: string;
    width: number | undefined;
}

export interface MessageEmbedProvider {
    name: string;
    url: string | undefined;
}

// TODO: An embed thumbnail either:
// has `height`, `placeholder`, `placeholderVersion`, `proxyURL`, `url`, and `width`
// or has only `height`, `url`, and `width`.
export interface MessageEmbedThumbnail {
    height: number;
    placeholder: string | undefined;
    placeholderVersion: number | undefined;
    proxyURL: string | undefined;
    url: string;
    width: number;
}

export const enum MessageEmbedTypes {
    APPLICATION_NEWS = "application_news",
    ARTICLE = "article",
    AUTO_MODERATION_MESSAGE = "auto_moderation_message",
    AUTO_MODERATION_NOTIFICATION = "auto_moderation_notification",
    GAMING_PROFILE = "gaming_profile",
    GIFT = "gift",
    GIFV = "gifv",
    IMAGE = "image",
    LINK = "link",
    POLL_RESULT = "poll_result",
    POST_PREVIEW = "post_preview",
    RICH = "rich",
    SAFETY_POLICY_NOTICE = "safety_policy_notice",
    SAFETY_SYSTEM_NOTIFICATION = "safety_system_notification",
    TEXT = "text",
    TWEET = "tweet",
    VIDEO = "video",
    VOICE_CHANNEL = "voice_channel",
}

// TODO: An embed video must have either `proxyURL` or `url`, and having both is possible.
// It might not be possible for an embed video to have `proxyURL` without `url`, though.
export interface MessageEmbedVideo {
    height: number;
    placeholder: string | undefined;
    placeholderVersion: number | undefined;
    proxyURL: string | undefined;
    url: string | undefined;
    width: number;
}

export interface MessageEmbed {
    author?: MessageEmbedAuthor;
    color?: string;
    contentScanVersion: number | undefined;
    fields: MessageEmbedField[];
    flags: MessageEmbedFlags | undefined;
    footer?: MessageEmbedFooter;
    id: string;
    image?: MessageEmbedImage;
    provider?: MessageEmbedProvider;
    rawDescription: string | undefined;
    rawTitle: string | undefined;
    referenceId: string | undefined;
    thumbnail?: MessageEmbedThumbnail;
    timestamp?: Moment;
    type: MessageEmbedTypes | undefined;
    url: string | undefined;
    video?: MessageEmbedVideo;
}

export const enum MessageFlags {
    CROSSPOSTED = 1 << 0,
    IS_CROSSPOST = 1 << 1,
    SUPPRESS_EMBEDS = 1 << 2,
    SOURCE_MESSAGE_DELETED = 1 << 3,
    URGENT = 1 << 4,
    HAS_THREAD = 1 << 5,
    EPHEMERAL = 1 << 6,
    LOADING = 1 << 7,
    FAILED_TO_MENTION_SOME_ROLES_IN_THREAD = 1 << 8,
    SHOULD_SHOW_LINK_NOT_DISCORD_WARNING = 1 << 10,
    SUPPRESS_NOTIFICATIONS = 1 << 12,
    IS_VOICE_MESSAGE = 1 << 13,
    HAS_SNAPSHOT = 1 << 14,
    IS_UIKIT_COMPONENTS = 1 << 15,
}

export interface MessageGiftInfo {
    emoji?: string | null; // TEMP
    sound?: string | null; // TEMP
} // TEMP

export const enum InteractionTypes {
    PING = 1,
    APPLICATION_COMMAND = 2,
    MESSAGE_COMPONENT = 3,
    APPLICATION_COMMAND_AUTOCOMPLETE = 4,
    MODAL_SUBMIT = 5,
}

export class InteractionRecord extends ImmutableRecord {
    constructor(interaction: Record<string, any>); // TEMP

    static createFromServer(interactionFromServer: Record<string, any>): InteractionRecord; // TEMP

    displayName: string;
    id: string;
    name: string;
    type: InteractionTypes;
    user: UserRecord;
}

export interface InteractionData {
    application_command: any; // TEMP
    guild_id: any; // TEMP
    id: any; // TEMP
    name: any; // TEMP
    options: any; // TEMP
    type: any; // TEMP
    version: any; // TEMP
} // TEMP

export interface InteractionMetadata {
    authorizing_integration_owners: Partial<Record<ApplicationIntegrationType, string>>;
    id: string;
    interacted_message_id?: string;
    original_response_message_id?: string;
    type: InteractionTypes;
    triggering_interaction_metadata?: InteractionMetadata;
    user: Record<string, any>; // TEMP: This is not a UserRecord, it's a user object from the API.
} // TEMP

export interface ChannelMention {
    guild_id: string;
    id: string;
    name: string;
    type: ChannelTypes;
}

export interface MessageReference {
    channel_id: string;
    guild_id?: string;
    message_id?: string;
}

export const enum PollLayoutTypes {
    UNKNOWN = 0,
    DEFAULT = 1,
    IMAGE_ONLY_ANSWERS = 2,
}

export interface MessageEmoji {
    animated?: boolean;
    id: string | null;
    name: string | null;
}

export interface MessagePollMedia {
    emoji?: MessageEmoji;
    text?: string;
}

export interface MessagePollAnswer {
    answer_id: number;
    poll_media: MessagePollMedia;
}

export interface MessagePollAnswerCount {
    count: number;
    id: number;
    me_voted: boolean;
}

export interface MessagePollResults {
    answer_counts: MessagePollAnswerCount[];
    is_finalized: boolean;
}

export interface MessagePoll {
    allow_multiselect: boolean;
    answers: MessagePollAnswer[];
    expiry: Moment;
    layout_type: PollLayoutTypes;
    question: MessagePollMedia;
    results?: MessagePollResults;
}

export const enum PurchaseNotificationType {
    GUILD_PRODUCT = 0,
}

export interface MessagePurchaseNotification {
    guild_product_purchase: {
        listing_id?: string | null; // TEMP
        product_name?: string | null; // TEMP
    } // TEMP
    type: PurchaseNotificationType;
} // TEMP

export interface MessageReactionCountDetails {
    burst: number;
    normal: number;
    vote?: number;
}

export interface MessageReaction {
    burst_colors: string[];
    burst_count: number;
    count: number;
    count_details: MessageReactionCountDetails;
    emoji: MessageEmoji;
    me: boolean;
    me_burst: boolean;
    me_vote?: boolean;
}

export interface MessageRoleSubscriptionData {
    is_renewal?: boolean | null; // TEMP
    role_subscription_listing_id?: string | null; // TEMP
    tier_name?: string | null; // TEMP
    total_months_subscribed?: number | null; // TEMP
} // TEMP

export const enum MessageStates {
    SEND_FAILED = "SEND_FAILED",
    SENDING = "SENDING",
    SENT = "SENT",
}

export const enum StickerFormat {
    PNG = 1,
    APNG = 2,
    LOTTIE = 3,
    GIF = 4,
}

export interface MessageStickerItem {
    format_type: StickerFormat;
    id: string;
    name: string;
}

export const enum MetaStickerType {
    STANDARD = 1,
    GUILD = 2,
}

export interface MessageSticker {
    asset?: "";
    available?: boolean;
    description: string | null;
    format_type: StickerFormat;
    guild_id?: string;
    id: string;
    name: string;
    pack_id?: string;
    sort_value?: number;
    tags: string;
    type: MetaStickerType;
    user?: Record<string, any>; // TEMP: This is not a UserRecord, it's a user object from the API.
}

export const enum MessageTypes {
    DEFAULT = 0,
    RECIPIENT_ADD = 1,
    RECIPIENT_REMOVE = 2,
    CALL = 3,
    CHANNEL_NAME_CHANGE = 4,
    CHANNEL_ICON_CHANGE = 5,
    CHANNEL_PINNED_MESSAGE = 6,
    USER_JOIN = 7,
    GUILD_BOOST = 8,
    GUILD_BOOST_TIER_1 = 9,
    GUILD_BOOST_TIER_2 = 10,
    GUILD_BOOST_TIER_3 = 11,
    CHANNEL_FOLLOW_ADD = 12,
    GUILD_STREAM = 13,
    GUILD_DISCOVERY_DISQUALIFIED = 14,
    GUILD_DISCOVERY_REQUALIFIED = 15,
    GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING = 16,
    GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING = 17,
    THREAD_CREATED = 18,
    REPLY = 19,
    CHAT_INPUT_COMMAND = 20,
    THREAD_STARTER_MESSAGE = 21,
    GUILD_INVITE_REMINDER = 22,
    CONTEXT_MENU_COMMAND = 23,
    AUTO_MODERATION_ACTION = 24,
    ROLE_SUBSCRIPTION_PURCHASE = 25,
    INTERACTION_PREMIUM_UPSELL = 26,
    STAGE_START = 27,
    STAGE_END = 28,
    STAGE_SPEAKER = 29,
    STAGE_RAISE_HAND = 30,
    STAGE_TOPIC = 31,
    GUILD_APPLICATION_PREMIUM_SUBSCRIPTION = 32,
    PRIVATE_CHANNEL_INTEGRATION_ADDED = 33,
    PRIVATE_CHANNEL_INTEGRATION_REMOVED = 34,
    PREMIUM_REFERRAL = 35,
    GUILD_INCIDENT_ALERT_MODE_ENABLED = 36,
    GUILD_INCIDENT_ALERT_MODE_DISABLED = 37,
    GUILD_INCIDENT_REPORT_RAID = 38,
    GUILD_INCIDENT_REPORT_FALSE_ALARM = 39,
    GUILD_DEADCHAT_REVIVE_PROMPT = 40,
    CUSTOM_GIFT = 41,
    GUILD_GAMING_STATS_PROMPT = 42,
    PURCHASE_NOTIFICATION = 44,
    VOICE_HANGOUT_INVITE = 45,
    POLL_RESULT = 46,
    CHANGELOG = 47,
}

type MessageRecordOwnProperties = Pick<MessageRecord, "activity" | "activityInstance" | "application" | "applicationId" | "attachments" | "author" | "blocked" | "bot" | "call" | "changelogId" | "channel_id" | "codedLinks" | "colorString" | "components" | "content" | "customRenderedContent" | "editedTimestamp" | "embeds" | "flags" | "giftCodes" | "giftInfo" | "id" | "interaction" | "interactionData" | "interactionError" | "interactionMetadata" | "isSearchHit" | "isUnsupported" | "loggingName" | "mentionChannels" | "mentionEveryone" | "mentionRoles" | "mentioned" | "mentions" | "messageReference" | "messageSnapshots" | "nick" | "nonce" | "pinned" | "poll" | "purchaseNotification" | "reactions" | "referralTrialOfferId" | "roleSubscriptionData" | "state" | "stickerItems" | "stickers" | "timestamp" | "tts" | "type" | "webhookId">;

export class MessageRecord<
    OwnProperties extends MessageRecordOwnProperties = MessageRecordOwnProperties
> extends ImmutableRecord<OwnProperties> {
    constructor(messageFromServer: Record<string, any>); // TEMP

    addReaction(e?: any, t?: any, n?: any, r?: any): this; // TEMP
    addReactionBatch(e?: any, t?: any): any; // TEMP
    canDeleteOwnMessage(userId: string): boolean;
    getChannelId(): string;
    getReaction(e?: any): any; // TEMP
    hasFlag(flag: MessageFlags): boolean;
    isCommandType(): boolean;
    isEdited(): boolean;
    isFirstMessageInForumPost(channel: ChannelRecord): boolean; // TEMP
    isInteractionPlaceholder(): boolean;
    isPoll(): boolean;
    isSystemDM(): boolean;
    isUIKitComponents(): boolean;
    removeReaction(e?: any, t?: any, n?: any): this; // TEMP
    removeReactionsForEmoji(e?: any): this; // TEMP
    toJS(): OwnProperties & SnakeCasedProperties<Pick<OwnProperties, "editedTimestamp" | "mentionEveryone" | "webhookId">>;
    userHasReactedWithEmoji(e?: any, t?: any): boolean; // TEMP

    activity: any | null; // TEMP
    activityInstance: any | null; // TEMP
    application: any | null; // TEMP
    applicationId: string | null; // TEMP
    attachments: MessageAttachment[];
    author: UserRecord;
    blocked: boolean;
    bot: boolean;
    call: MessageCall | null;
    changelogId: string | null;
    channel_id: string;
    codedLinks: CodedLink[];
    colorString: string | undefined;
    components: MessageComponent[];
    content: string;
    customRenderedContent: any | undefined; // TEMP
    editedTimestamp: Date | null;
    embeds: MessageEmbed[];
    flags: MessageFlags;
    giftCodes: string[];
    giftInfo: MessageGiftInfo | undefined;
    id: string;
    interaction: InteractionRecord | null;
    interactionData: InteractionData | null;
    interactionError: string | null;
    interactionMetadata: InteractionMetadata | null;
    isSearchHit: boolean;
    isUnsupported: boolean;
    loggingName: string | null; // TEMP
    mentionChannels: ChannelMention[];
    mentionEveryone: boolean;
    mentionRoles: string[];
    mentioned: boolean;
    mentions: string[];
    messageReference: MessageReference | null;
    messageSnapshots: any[]; // TEMP
    nick: any | undefined; // TEMP
    nonce: string | number | null;
    pinned: boolean;
    poll: MessagePoll | undefined;
    purchaseNotification: MessagePurchaseNotification | undefined;
    reactions: MessageReaction[];
    referralTrialOfferId: string | null; // TEMP
    roleSubscriptionData: MessageRoleSubscriptionData | undefined;
    state: MessageStates;
    stickerItems: MessageStickerItem[];
    stickers: MessageSticker[];
    timestamp: Date;
    tts: boolean;
    type: MessageTypes;
    webhookId: string | null;
}

declare class MessageCache {
    constructor(isCacheBefore: boolean);

    cache(e?: any): void; // TEMP
    clear(): void; // TEMP
    clone(): any; // TEMP
    extract(e?: any): any; // TEMP
    extractAll(): any; // TEMP
    forEach(callback: (value: any, index: number, array: any[]) => void, thisArg?: unknown): void; // TEMP
    get(e?: any): any; // TEMP
    has(e?: any): boolean; // TEMP
    get length(): any; // TEMP
    remove(e?: any): void; // TEMP
    removeMany(e?: any): void; // TEMP
    replace(e?: any, t?: any): void; // TEMP
    update(e?: any, t?: any): void; // TEMP
    get wasAtEdge(): any; // TEMP
    set wasAtEdge(e: any); // TEMP

    _isCacheBefore: boolean;
    _map: any; // TEMP
    _messages: any[]; // TEMP
    _wasAtEdge: boolean;
}

export const enum JumpTypes {
    ANIMATED = "ANIMATED",
    INSTANT = "INSTANT",
}

export class ChannelMessages {
    constructor(channelId: string);

    static _channelMessages: any; // TEMP
    static clear(e?: any): any; // TEMP
    static clearCache(e?: any): any; // TEMP
    static commit(e?: any): any; // TEMP
    static forEach(e?: any): any; // TEMP
    static get(e?: any): any; // TEMP
    static getOrCreate(e?: any): any; // TEMP
    static hasPresent(e?: any): any; // TEMP

    _clearMessages(): void;
    _merge(e?: any): any; // TEMP
    addCachedMessages(e?: any, t?: any): any; // TEMP
    filter<T extends MessageRecord>(
        predicate: (value: MessageRecord, index: number, array: MessageRecord[]) => value is T,
        thisArg?: unknown
    ): T[];
    filter(
        predicate: (value: MessageRecord, index: number, array: MessageRecord[]) => unknown,
        thisArg?: unknown
    ): MessageRecord[];
    findNewest(e?: any): any; // TEMP
    findOldest(e?: any): any; // TEMP
    first(): MessageRecord | undefined;
    focusOnMessage(e?: any): any; // TEMP
    forAll(
        callback: (value: MessageRecord, index: number, array: MessageRecord[]) => void,
        thisArg?: unknown
    ): void;
    forEach(
        callback: (value: MessageRecord, index: number, array: MessageRecord[]) => void,
        thisArg?: unknown
    ): void;
    get(e?: any): any; // TEMP
    getAfter(e?: any): any; // TEMP
    getByIndex(index: number): any | undefined; // TEMP
    getManyAfter(e?: any, t?: any, n?: any): any; // TEMP
    getManyBefore(e?: any, t?: any, n?: any): any; // TEMP
    has(e?: any): boolean; // TEMP
    hasAfterCached(e?: any): any; // TEMP
    hasBeforeCached(e?: any): any; // TEMP
    hasPresent(): any; // TEMP
    indexOf(searchElement: any): number; // TEMP
    jumpToMessage(e?: any): any; // TEMP
    jumpToPresent(e?: any): any; // TEMP
    last(): MessageRecord | undefined;
    get length(): number;
    loadComplete(e?: any): any; // TEMP
    loadFromCache(e?: any, t?: any): any; // TEMP
    loadStart(e?: any): any; // TEMP
    map<T>(
        callback: (value: MessageRecord, index: number, array: MessageRecord[]) => T,
        thisArg?: unknown
    ): T[];
    merge(e?: any): any; // TEMP
    mergeDelta(): any; // TEMP
    mutate(e?: any): any; // TEMP
    receiveMessage(e?: any): any; // TEMP
    receivePushNotification(e?: any): any; // TEMP
    reduce(
        callback: (
            previousValue: MessageRecord,
            currentValue: MessageRecord,
            currentIndex: number,
            array: MessageRecord[]
        ) => MessageRecord
    ): MessageRecord;
    reduce(
        callback: (
            previousValue: MessageRecord,
            currentValue: MessageRecord,
            currentIndex: number,
            array: MessageRecord[]
        ) => MessageRecord,
        initialValue: MessageRecord
    ): MessageRecord;
    reduce<T>(
        callback: (
            previousValue: MessageRecord,
            currentValue: T,
            currentIndex: number,
            array: MessageRecord[]
        ) => T,
        initialValue: T
    ): T;
    remove(e?: any): any; // TEMP
    removeMany(e?: any): any; // TEMP
    replace(e?: any, t?: any): any; // TEMP
    reset(e?: any): any; // TEMP
    some(
        predicate: (value: MessageRecord, index: number, array: MessageRecord[]) => unknown,
        thisArg?: unknown
    ): boolean;
    toArray(): MessageRecord[];
    truncate(e?: any, t?: any): any; // TEMP
    truncateBottom(e?: any): any; // TEMP
    truncateTop(e?: any): any; // TEMP
    update(e?: any, t?: any): any; // TEMP

    _after: MessageCache;
    _array: MessageRecord[];
    _before: MessageCache;
    _map: { [messageId: string]: MessageRecord; };
    cached: boolean;
    channelId: string;
    error: boolean;
    focusTargetId: any; // TEMP
    hasFetched: boolean;
    hasMoreAfter: boolean;
    hasMoreBefore: boolean;
    jumpFlash: boolean;
    jumpReturnTargetId: string | null; // TEMP
    jumpSequenceId: number; // TEMP
    jumpTargetId: string | null; // TEMP
    jumpTargetOffset: number; // TEMP
    jumpType: JumpTypes;
    jumped: boolean;
    jumpedToPresent: boolean;
    loadingMore: boolean;
    ready: boolean;
    revealedMessageId: string | null; // TEMP
}

type MessageStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC_CHANNEL_MESSAGES" | "CACHE_LOADED" | "CHANNEL_DELETE" | "CLEAR_MESSAGES" | "CONNECTION_OPEN" | "GUILD_DELETE" | "GUILD_MEMBERS_CHUNK_BATCH" | "LOAD_MESSAGES" | "LOAD_MESSAGES_FAILURE" | "LOAD_MESSAGES_SUCCESS" | "LOAD_MESSAGES_SUCCESS_CACHED" | "LOAD_MESSAGE_INTERACTION_DATA_SUCCESS" | "LOCAL_MESSAGES_LOADED" | "LOCAL_MESSAGE_CREATE" | "LOGOUT" | "MESSAGE_CREATE" | "MESSAGE_DELETE" | "MESSAGE_DELETE_BULK" | "MESSAGE_EDIT_FAILED_AUTOMOD" | "MESSAGE_EXPLICIT_CONTENT_SCAN_TIMEOUT" | "MESSAGE_REACTION_ADD" | "MESSAGE_REACTION_ADD_MANY" | "MESSAGE_REACTION_REMOVE" | "MESSAGE_REACTION_REMOVE_ALL" | "MESSAGE_REACTION_REMOVE_EMOJI" | "MESSAGE_REVEAL" | "MESSAGE_SEND_FAILED" | "MESSAGE_SEND_FAILED_AUTOMOD" | "MESSAGE_UPDATE" | "OVERLAY_INITIALIZE" | "RELATIONSHIP_ADD" | "RELATIONSHIP_REMOVE" | "THREAD_CREATE_LOCAL" | "THREAD_DELETE" | "THREAD_MEMBER_LIST_UPDATE" | "TRUNCATE_MESSAGES" | "UPLOAD_FAIL" | "UPLOAD_START">;

export class MessageStore<Action extends FluxAction = MessageStoreAction> extends FluxStore<Action> {
    static displayName: "MessageStore";

    focusedMessageId(e?: any): any; // TEMP
    getLastCommandMessage(e?: any): any; // TEMP
    getLastEditableMessage(e?: any): any; // TEMP
    getLastMessage(e?: any): any; // TEMP
    getLastNonCurrentUserMessage(e?: any): any; // TEMP
    getMessage(e?: any, t?: any): any; // TEMP
    getMessages(guildId?: string | Nullish): any; // TEMP
    hasCurrentUserSentMessage(e?: any): any; // TEMP
    hasCurrentUserSentMessageSinceAppStart(): any; // TEMP
    hasPresent(e?: any): any; // TEMP
    initialize(): void;
    isLoadingMessages(e?: any): any; // TEMP
    isReady(e?: any): any; // TEMP
    jumpedMessageId(e?: any): any; // TEMP
    whenReady(e?: any, t?: any): any; // TEMP
}

export const enum RelationshipTypes {
    NONE = 0,
    FRIEND = 1,
    BLOCKED = 2,
    PENDING_INCOMING = 3,
    PENDING_OUTGOING = 4,
    IMPLICIT = 5,
    SUGGESTION = 6,
}

type RelationshipStoreAction = ExtractAction<FluxAction, "CONNECTION_OPEN" | "OVERLAY_INITIALIZE" | "RELATIONSHIP_ADD" | "RELATIONSHIP_PENDING_INCOMING_REMOVED" | "RELATIONSHIP_REMOVE" | "RELATIONSHIP_UPDATE">;

export class RelationshipStore<Action extends FluxAction = RelationshipStoreAction> extends FluxStore<Action> {
    static displayName: "RelationshipStore";

    getFriendCount(): number;
    getFriendIDs(): string[];
    getNickname(userId: string): string | undefined;
    getOutgoingCount(): number;
    getPendingCount(): number;
    getRelationshipCount(): number;
    getRelationships(): { [userId: string]: RelationshipTypes; };
    getRelationshipType(userId: string): RelationshipTypes;
    getSince(userId: string): string | undefined;
    getSinces(): { [userId: string]: string; };
    initialize(): void;
    isBlocked(userId: string): boolean;
    isFriend(userId: string): boolean;
}

type SelectedChannelStoreAction = ExtractAction<FluxAction, "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_FOLLOWER_CREATED" | "CHANNEL_SELECT" | "CHANNEL_UPDATES" | "CONNECTION_CLOSED" | "CONNECTION_OPEN" | "GUILD_CREATE" | "GUILD_DELETE" | "LOGOUT" | "OVERLAY_INITIALIZE" | "THREAD_DELETE" | "VOICE_CHANNEL_SELECT" | "VOICE_STATE_UPDATES">;

export class SelectedChannelStore<Action extends FluxAction = SelectedChannelStoreAction> extends FluxStore<Action> {
    static displayName: "SelectedChannelStore";

    getChannelId(guildId?: string | Nullish): string | undefined;
    getCurrentlySelectedChannelId(guildId?: string | Nullish): string | Nullish;
    getLastChannelFollowingDestination(): {
        channelId: string;
        guildId: string;
    };
    getLastSelectedChannelId(guildId?: string | Nullish): string | undefined;
    getLastSelectedChannels(guildId: string | null): string | undefined;
    getMostRecentSelectedTextChannelId(guildId?: string | Nullish): string | null;
    getVoiceChannelId(): string | null;
    initialize(): void;
}

interface SelectedGuildStoreState {
    lastSelectedGuildId: string | null;
    selectedGuildId: string | null;
    selectedGuildTimestampMillis: { [guildId: string]: number; };
}

type SelectedGuildStoreAction = ExtractAction<FluxAction, "CHANNEL_SELECT" | "CONNECTION_OPEN" | "GUILD_DELETE" | "GUILD_MEMBER_REMOVE" | "LOGOUT" | "OVERLAY_INITIALIZE">;

export class SelectedGuildStore<
    Constructor extends GenericConstructor = typeof SelectedGuildStore,
    State extends SelectedGuildStoreState = SelectedGuildStoreState,
    Action extends FluxAction = SelectedGuildStoreAction
> extends FluxPersistedStore<Constructor, State, Action> {
    static displayName: "SelectedGuildStore";
    static persistKey: "SelectedGuildStore";

    initialize(state: SelectedGuildStoreState): void;
    getState(): State;
    getGuildId(): string | null;
    getLastSelectedGuildId(): string | null;
    getLastSelectedTimestamp(guildId: string): number | undefined;
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
    SOCIAL_LAYER_INTEGRATION = 1 << 27,
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
    WEBHOOK_INCOMING = "webhook.incoming",
}

export interface ApplicationInstallParams {
    scopes: OAuth2Scopes[];
    permissions: string; // Permissions serialized as string
}

export const enum ApplicationIntegrationType {
    GUILD_INSTALL = 0,
    USER_INSTALL = 1,
}

export interface Application {
    customInstallUrl: string | undefined;
    flags: ApplicationFlags;
    id: string;
    installParams: ApplicationInstallParams | undefined;
    integrationTypesConfig: Partial<Record<ApplicationIntegrationType, {
        oauth2_install_params?: ApplicationInstallParams;
    } | null>>;
    popularApplicationCommandIds: string[] | undefined;
    primarySkuId: string | undefined;
    storefront_available: boolean;
}

export interface ApplicationRoleConnection {
    metadata: Record<string, string | number>;
    platform_name: string | null;
    platform_username: string | null;
}

export interface ProfileBadge {
    description: string;
    icon: string;
    id: string;
    link?: string;
}

export const enum PlatformTypes {
    AMAZON_MUSIC = "amazon-music",
    BATTLENET = "battlenet",
    BUNGIE = "bungie",
    CONTACTS = "contacts",
    CRUNCHYROLL = "crunchyroll",
    DOMAIN = "domain",
    EBAY = "ebay",
    EPIC_GAMES = "epicgames",
    FACEBOOK = "facebook",
    GITHUB = "github",
    INSTAGRAM = "instagram",
    LEAGUE_OF_LEGENDS = "leagueoflegends",
    PAYPAL = "paypal",
    PLAYSTATION = "playstation",
    PLAYSTATION_STAGING = "playstation-stg",
    REDDIT = "reddit",
    RIOT_GAMES = "riotgames",
    ROBLOX = "roblox",
    SAMSUNG = "samsung",
    SKYPE = "skype",
    SOUNDCLOUD = "soundcloud",
    SPOTIFY = "spotify",
    STEAM = "steam",
    TIKTOK = "tiktok",
    TWITCH = "twitch",
    TWITTER = "twitter",
    TWITTER_LEGACY = "twitter_legacy",
    XBOX = "xbox",
    YOUTUBE = "youtube",
}

export interface ConnectedAccount {
    id: string;
    metadata?: Record<string, string | number | boolean>;
    name: string;
    type: PlatformTypes;
    verified: boolean;
}

type ProfileThemeColors = [primaryColor: number, accentColor: number];

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
    application: Application | null;
    accentColor: number | Nullish;
    applicationRoleConnections: ApplicationRoleConnection[];
    badges: ProfileBadge[];
    banner: string | Nullish;
    bio: string;
    connectedAccounts: ConnectedAccount[];
    lastFetched: number;
    legacyUsername: string | Nullish;
    popoutAnimationParticleType: any /* |  Nullish */; // TEMP
    premiumGuildSince: Date | null;
    premiumSince: Date | null;
    premiumType: PremiumTypes | Nullish;
    profileEffectId: string | undefined;
    profileFetchFailed: false;
    pronouns: string;
    themeColors: ProfileThemeColors | Nullish;
    userId: string;
}

export type UserProfile<FetchFailed extends boolean = boolean> = FetchFailed extends true
    ? UserProfileFetchFailed
    : UserProfileFetchSucceeded;

export interface GuildMemberProfile {
    accentColor: number | Nullish;
    badges: ProfileBadge[];
    banner: string | Nullish;
    bio: string | undefined;
    guildId: string;
    popoutAnimationParticleType: any /* | Nullish */; // TEMP
    profileEffectId: string | undefined;
    pronouns: string;
    themeColors: ProfileThemeColors | Nullish;
    userId: string;
}

export const enum StatusTypes {
    DND = "dnd",
    IDLE = "idle",
    INVISIBLE = "invisible",
    OFFLINE = "offline",
    ONLINE = "online",
    STREAMING = "streaming",
    UNKNOWN = "unknown",
}

interface UserProfileStoreSnapshotData {
    userId: string;
    profile: UserProfile | undefined;
}

type UserProfileStoreAction = ExtractAction<FluxAction, "CACHE_LOADED_LAZY" | "GUILD_DELETE" | "GUILD_JOIN" | "GUILD_MEMBER_ADD" | "GUILD_MEMBER_REMOVE" | "GUILD_MEMBER_UPDATE" | "LOGOUT" | "MUTUAL_FRIENDS_FETCH_FAILURE" | "MUTUAL_FRIENDS_FETCH_START" | "MUTUAL_FRIENDS_FETCH_SUCCESS" | "USER_PROFILE_ACCESSIBILITY_TOOLTIP_VIEWED" | "USER_PROFILE_FETCH_FAILURE" | "USER_PROFILE_FETCH_START" | "USER_PROFILE_FETCH_SUCCESS" | "USER_PROFILE_UPDATE_FAILURE" | "USER_PROFILE_UPDATE_START" | "USER_PROFILE_UPDATE_SUCCESS" | "USER_UPDATE">;

export class UserProfileStore<
    Constructor extends GenericConstructor = typeof UserProfileStore
> extends FluxSnapshotStore<Constructor, UserProfileStoreSnapshotData, UserProfileStoreAction> {
    constructor();

    static displayName: "UserProfileStore";
    static LATEST_SNAPSHOT_VERSION: number;

    getUserProfile<FetchFailed extends boolean = boolean>(userId: string): UserProfile<FetchFailed> | undefined;
    getGuildMemberProfile(userId: string, guildId?: string | Nullish): GuildMemberProfile | Nullish;
    getIsAccessibilityTooltipViewed(): boolean;
    getMutualFriends(userId: string): {
        key: string; // userId
        status: StatusTypes;
        user: UserRecord;
    }[] | undefined;
    getMutualFriendsCount(userId: string): number | undefined;
    getMutualGuilds(userId: string): {
        guild: GuildRecord;
        nick: string | null;
    }[] | undefined;
    isFetchingFriends(userId: string): boolean;
    isFetchingProfile(userId: string): boolean;
    get isSubmitting(): boolean;
    takeSnapshot(): FluxSnapshot<UserProfileStoreSnapshotData>;

    loadCache: () => void;
}

export interface AvatarDecorationData {
    asset: string;
    skuId: string;
}

export interface UserClanData {
    badge: string | null;
    identityEnabled: boolean | null;
    identityGuildId: string | null;
    tag: string | null;
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
    TIER_1 = 1, // Nitro Classic
    TIER_2 = 2, // Nitro
    TIER_0 = 3, // Nitro Basic
}

type UserRecordOwnProperties = Pick<UserRecord, "avatar" | "avatarDecorationData" | "bot" | "clan" | "desktop" | "discriminator" | "email" | "flags" | "globalName" | "guildMemberAvatars" | "hasAnyStaffLevel" | "hasBouncedEmail" | "hasFlag" | "id" | "isStaff" | "isStaffPersonal" | "mfaEnabled" | "mobile" | "nsfwAllowed" | "personalConnectionId" | "phone" | "premiumType" | "premiumUsageFlags" | "publicFlags" | "purchasedFlags" | "system" | "username" | "verified">;

export class UserRecord<
    OwnProperties extends UserRecordOwnProperties = UserRecordOwnProperties
> extends ImmutableRecord<OwnProperties> {
    constructor(userFromServer: Record<string, any>); // TEMP

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
    ): IconSource;
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
    removeGuildAvatarHash(guildId: string): this;
    get tag(): string;

    avatar: string | null;
    avatarDecorationData: AvatarDecorationData | null;
    banner: string | Nullish;
    bot: boolean;
    clan: UserClanData | null;
    desktop: boolean;
    discriminator: string;
    email: string | null;
    flags: UserFlags;
    globalName: string | Nullish;
    guildMemberAvatars: { [guildId: string]: string; };
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
    premiumType: PremiumTypes | Nullish; // discord seems to have recently made it so that premiumType is undefined for every UserRecord except for that of the current user
    premiumUsageFlags: number;
    publicFlags: UserFlags;
    purchasedFlags: number;
    system: boolean;
    username: string;
    verified: boolean;
}

interface UserStoreSnapshotData {
    users: [UserRecord] | [];
}

type UserStoreAction = ExtractAction<FluxAction, "AUDIT_LOG_FETCH_NEXT_PAGE_SUCCESS" | "AUDIT_LOG_FETCH_SUCCESS" | "CACHE_LOADED" | "CHANNEL_CREATE" | "CHANNEL_RECIPIENT_ADD" | "CHANNEL_RECIPIENT_REMOVE" | "CHANNEL_UPDATES" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "CURRENT_USER_UPDATE" | "FAMILY_CENTER_INITIAL_LOAD" | "FAMILY_CENTER_LINKED_USERS_FETCH_SUCCESS" | "FAMILY_CENTER_REQUEST_LINK_SUCCESS" | "FAMILY_CENTER_TEEN_ACTIVITY_FETCH_SUCCESS" | "FAMILY_CENTER_TEEN_ACTIVITY_MORE_FETCH_SUCCESS" | "FETCH_PRIVATE_CHANNEL_INTEGRATIONS_SUCCESS" | "FRIEND_SUGGESTION_CREATE" | "GIFT_CODE_RESOLVE_SUCCESS" | "GUILD_APPLIED_BOOSTS_FETCH_SUCCESS" | "GUILD_BAN_ADD" | "GUILD_BAN_REMOVE" | "GUILD_CREATE" | "GUILD_FEED_FETCH_SUCCESS" | "GUILD_JOIN_REQUEST_CREATE" | "GUILD_JOIN_REQUEST_UPDATE" | "GUILD_MEMBERS_CHUNK_BATCH" | "GUILD_MEMBER_ADD" | "GUILD_MEMBER_LIST_UPDATE" | "GUILD_MEMBER_UPDATE" | "GUILD_SCHEDULED_EVENT_USERS_FETCH_SUCCESS" | "GUILD_SETTINGS_LOADED_BANS" | "GUILD_SETTINGS_LOADED_BANS_BATCH" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_FORUM_POSTS" | "LOAD_FRIEND_SUGGESTIONS_SUCCESS" | "LOAD_MESSAGES_AROUND_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_MESSAGE_REQUESTS_SUPPLEMENTAL_DATA_SUCCESS" | "LOAD_NOTIFICATION_CENTER_ITEMS_SUCCESS" | "LOAD_PINNED_MESSAGES_SUCCESS" | "LOAD_RECENT_MENTIONS_SUCCESS" | "LOAD_RELATIONSHIPS_SUCCESS" | "LOAD_THREADS_SUCCESS" | "LOCAL_MESSAGES_LOADED" | "MEMBER_SAFETY_GUILD_MEMBER_SEARCH_SUCCESS" | "MESSAGE_CREATE" | "MESSAGE_UPDATE" | "MOD_VIEW_SEARCH_FINISH" | "NOTIFICATION_CENTER_ITEM_CREATE" | "OVERLAY_INITIALIZE" | "PASSIVE_UPDATE_V2" | "PRESENCE_UPDATES" | "PRIVATE_CHANNEL_INTEGRATION_CREATE" | "PRIVATE_CHANNEL_INTEGRATION_UPDATE" | "RELATIONSHIP_ADD" | "SEARCH_FINISH" | "THREAD_LIST_SYNC" | "THREAD_MEMBERS_UPDATE" | "THREAD_MEMBER_LIST_UPDATE" | "UPDATE_CLIENT_PREMIUM_TYPE" | "USER_UPDATE">;

export class UserStore<
    Constructor extends GenericConstructor = typeof UserStore
> extends FluxSnapshotStore<Constructor, UserStoreSnapshotData, UserStoreAction> {
    constructor();

    static displayName: "UserStore";
    static LATEST_SNAPSHOT_VERSION: number;

    filter<T extends UserRecord>(predicate: (user: UserRecord) => user is T, sort?: boolean | undefined): T[];
    filter(predicate: (user: UserRecord) => unknown, sort?: boolean | undefined): UserRecord[];
    findByTag(username: string, discriminator?: string | Nullish): UserRecord | undefined;
    forEach(callback: (user: UserRecord) => boolean | void): void;
    getCurrentUser(): UserRecord | undefined; // returns undefined if called before the first USER_UPDATE action for the current user. discord seems to always check != null too
    getUser(userId?: string | Nullish): UserRecord | undefined;
    getUsers(): { [userId: string]: UserRecord; };
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
