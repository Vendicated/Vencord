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

export const enum PermissionOverwriteType {
    ROLE = 0,
    MEMBER = 1,
}

interface PermissionOverwrites {
    [roleIdOrUserId: string]: {
        allow: /* Permissions */ bigint;
        deny: /* Permissions */ bigint;
        id: string;
        type: PermissionOverwriteType;
    };
}

export const enum SafetyWarningTypes {
    STRANGER_DANGER = 1,
    INAPPROPRIATE_CONVERSATION_TIER_1 = 2,
    INAPPROPRIATE_CONVERSATION_TIER_2 = 3,
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

type ChannelRecordOwnKeys = "application_id" | "appliedTags" | "availableTags" | "bitrate_" | "defaultAutoArchiveDuration" | "defaultForumLayout" | "defaultReactionEmoji" | "defaultSortOrder" | "defaultThreadRateLimitPerUser" | "flags_" | "guild_id" | "icon" | "iconEmoji" | "id" | "isMessageRequest" | "isMessageRequestTimestamp" | "isSpam" | "lastMessageId" | "lastPinTimestamp" | "member" | "memberCount" | "memberIdsPreview" | "memberListId" | "messageCount" | "name" | "nicks" | "nsfw_" | "originChannelId" | "ownerId" | "parentChannelThreadType" | "parent_id" | "permissionOverwrites_" | "position_" | "rateLimitPerUser_" | "rawRecipients" | "recipients" | "rtcRegion" | "safetyWarnings" | "template" | "themeColor" | "threadMetadata" | "topic_" | "totalMessageSent" | "type" | "userLimit_" | "version" | "videoQualityMode";

type ChannelRecordOwnProperties<ChannelRecord extends ChannelRecordBase> = Pick<ChannelRecord, ChannelRecordOwnKeys>;

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
    isForumChannel(): this is ForumChannelRecord<ChannelTypes.GUILD_FORUM>;
    isForumLikeChannel(): this is ForumChannelRecord<ChannelTypes.GUILD_FORUM | ChannelTypes.GUILD_MEDIA>;
    isForumPost(): boolean; // requires https://github.com/microsoft/TypeScript/issues/15048
    isGroupDM(): this is GroupDMChannelRecord;
    isGuildStageVoice(): this is GuildStageVoiceChannelRecord;
    isGuildVocal(): this is GuildVocalChannelRecord;
    isGuildVocalOrThread(): this is GuildVocalChannelRecord | ThreadChannelRecord<ChannelTypes.PUBLIC_THREAD | ChannelTypes.PRIVATE_THREAD>;
    isGuildVoice(): this is GuildVoiceChannelRecord;
    isListenModeCapable(): this is GuildStageVoiceChannelRecord;
    isLockedThread(): boolean; // requires https://github.com/microsoft/TypeScript/issues/15048
    isManaged(): boolean;
    isMediaChannel(): this is ForumChannelRecord<ChannelTypes.GUILD_MEDIA>;
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
    get permissionOverwrites(): PermissionOverwrites;
    get position(): number;
    get rateLimitPerUser(): number;
    set<Key extends ChannelRecordOwnKeys>(key: Key, value: ChannelRecordOwnProperties<this>[Key]): this;
    toJS(): ChannelRecordOwnProperties<this>;
    get topic(): string;
    get userLimit(): number;

    application_id?: string | undefined;
    appliedTags?: string[] | undefined;
    availableTags?: {
        id: string;
        emojiId: string | null;
        emojiName: string | null;
        moderated: boolean;
        name: string;
    }[] | undefined;
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
    member?: {
        flags: ThreadMemberFlags;
        joinTimestamp: string;
        muteConfig: {
            end_time: string | null;
            selected_time_window: number;
        } | null;
        muted: boolean;
    } | undefined;
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
    permissionOverwrites_?: PermissionOverwrites | undefined;
    position_?: number | undefined;
    rateLimitPerUser_?: number | undefined;
    rawRecipients?: Record<string, any>[] | undefined; // TEMP
    recipients?: string[] | undefined;
    rtcRegion?: string | Nullish;
    safetyWarnings?: {
        type: SafetyWarningTypes;
        dismiss_timestamp: string | undefined; // TEMP
    }[] | undefined; // TEMP
    template?: string | undefined;
    themeColor?: number | Nullish;
    threadMetadata?: {
        archived: boolean;
        archiveTimestamp: string;
        autoArchiveDuration: number;
        createTimestamp: string | Nullish;
        invitable: boolean;
        locked: boolean;
    } | undefined;
    topic_?: string | Nullish;
    totalMessageSent?: number | undefined;
    type: ChannelTypes;
    userLimit_?: number | undefined;
    version?: number | undefined;
    videoQualityMode?: VideoQualityMode | undefined;
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
    iconEmoji: Defined<ChannelRecordBase["iconEmoji"]>;
    isMessageRequest?: undefined;
    isMessageRequestTimestamp?: undefined;
    isSpam?: undefined;
    lastMessageId: ChannelRecordBase["lastMessageId"];
    lastPinTimestamp: ChannelRecordBase["lastPinTimestamp"];
    member?: undefined;
    memberCount?: undefined;
    memberIdsPreview?: undefined;
    memberListId: ChannelRecordBase["memberListId"];
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
}

export class GuildTextChannelRecord extends GuildTextualChannelRecordBase {
    type: ChannelTypes.GUILD_TEXT;
} // TEMP

export class GuildCategoryChannelRecord extends GuildTextualChannelRecordBase {
    type: ChannelTypes.GUILD_CATEGORY;
} // TEMP

export class GuildAnnouncementChannelRecord extends GuildTextualChannelRecordBase {
    type: ChannelTypes.GUILD_ANNOUNCEMENT;
} // TEMP

export class GuildStoreChannelRecord extends GuildTextualChannelRecordBase {
    type: ChannelTypes.GUILD_STORE;
} // TEMP

export class GuildDirectoryChannelRecord extends GuildTextualChannelRecordBase {
    type: ChannelTypes.GUILD_DIRECTORY;
} // TEMP

export type GuildTextualChannelRecord = GuildTextChannelRecord | GuildCategoryChannelRecord | GuildAnnouncementChannelRecord | GuildStoreChannelRecord | GuildDirectoryChannelRecord;

export abstract class PrivateChannelRecordBase extends ChannelRecordBase {
    constructor(channelProperties: Record<string, any>); // TEMP

    static fromServer(channelFromServer: Record<string, any>): PrivateChannelRecord; // TEMP
    static sortRecipients(recipients: Record<string, any>[] | Nullish, channelId: string): string[]; // TEMP

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
    icon: ChannelRecordBase["icon"];
    iconEmoji?: undefined;
    isMessageRequest: ChannelRecordBase["isMessageRequest"];
    isMessageRequestTimestamp: ChannelRecordBase["isMessageRequestTimestamp"];
    isSpam: Defined<ChannelRecordBase["isSpam"]>;
    lastMessageId: Defined<ChannelRecordBase["lastMessageId"]>;
    lastPinTimestamp: undefined;
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
}

export class DMChannelRecord extends PrivateChannelRecordBase {
    type: ChannelTypes.DM;
} // TEMP

export class GroupDMChannelRecord extends PrivateChannelRecordBase{
    application_id: ChannelRecordBase["application_id"];
    type: ChannelTypes.GROUP_DM;
} // TEMP

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
    iconEmoji: Defined<ChannelRecordBase["iconEmoji"]>;
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
}

export class GuildVoiceChannelRecord extends GuildVocalChannelRecordBase {
    type: ChannelTypes.GUILD_VOICE;
} // TEMP

export class GuildStageVoiceChannelRecord extends GuildVocalChannelRecordBase {
    type: ChannelTypes.GUILD_STAGE_VOICE;
} // TEMP

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
}

type ForumChannelType = ChannelTypes.GUILD_FORUM | ChannelTypes.GUILD_MEDIA;

export class ForumChannelRecord<ChannelType extends ForumChannelType = ForumChannelType> extends ChannelRecordBase {
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
    type: ChannelType;
    userLimit_?: undefined;
    version: ChannelRecordBase["version"];
    videoQualityMode?: undefined;
}

export class UnknownChannelRecord extends ChannelRecordBase {
    constructor(channelProperties: Record<string, any>); // TEMP

    static fromServer(channelFromServer: Record<string, any>, guildId?: string | Nullish): UnknownChannelRecord; // TEMP

    type: ChannelTypes.UNKNOWN;
} // TEMP

export type GuildChannelRecord = GuildTextualChannelRecord | GuildVocalChannelRecord | ForumChannelRecord;

export type ChannelRecord = GuildChannelRecord | PrivateChannelRecord | ThreadChannelRecord | UnknownChannelRecord;

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
    getMutableBasicGuildChannelsForGuild(guildId: string): { [channelId: string]: GuildChannelRecord; } | undefined; // TEMP
    getMutableDMsByUserIds(): { [userId: string]: string; };
    getMutableGuildChannelsForGuild(guildId: string): { [channelId: string]: GuildChannelRecord; } | undefined;
    getMutablePrivateChannels(): { [channelId: string]: PrivateChannelRecord; };
    getPrivateChannelsVersion(): number;
    getSortedPrivateChannels(): PrivateChannelRecord[];
    hasChannel(channelId: string): boolean;
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
    AUTOMOD_QUARANTINED_CLAN_TAG = 1 << 10,
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

    getCommunicationDisabledUserMap(): { [userId: string]: string; };
    getCommunicationDisabledVersion(): number;
    getMember(guildId: string, userId: string): GuildMember | null; // TEMP
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
    isCurrentUserGuest(guildId?: string | Nullish): boolean;
    isGuestOrLurker(guildId?: string | Nullish, userId?: string | Nullish): boolean;
    isMember(guildId?: string | Nullish, userId?: string | Nullish): boolean;
    memberOf(userId: string): string[];
}

export const enum RoleFlags {
    IN_PROMPT = 1
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

export interface Clan {
    badge: string | Nullish;
    identityEnabled: boolean | undefined;
    identityGuildId: string | Nullish;
    tag: string | Nullish;
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
    clan: Clan | null; // TEMP
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

export const enum ApplicationIntegrationType {
    GUILD_INSTALL = 0,
    USER_INSTALL = 1,
}

interface ProfileBadge {
    description: string;
    icon: string;
    id: string;
    link?: string;
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
    badges: ProfileBadge[];
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
    popoutAnimationParticleType: Nullish; // TEMP
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

export class UserProfileStore extends FluxSnapshotStore<typeof UserProfileStore, UserProfileStoreSnapshotData> {
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
    clan: Clan | null;
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

interface UserStoreSnapshotData { users: [UserRecord] | []; }

type UserStoreAction = ExtractAction<FluxAction, "AUDIT_LOG_FETCH_NEXT_PAGE_SUCCESS" | "AUDIT_LOG_FETCH_SUCCESS" | "CACHE_LOADED" | "CHANNEL_CREATE" | "CHANNEL_RECIPIENT_ADD" | "CHANNEL_RECIPIENT_REMOVE" | "CHANNEL_UPDATES" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "CURRENT_USER_UPDATE" | "FAMILY_CENTER_INITIAL_LOAD" | "FAMILY_CENTER_LINKED_USERS_FETCH_SUCCESS" | "FAMILY_CENTER_REQUEST_LINK_SUCCESS" | "FAMILY_CENTER_TEEN_ACTIVITY_FETCH_SUCCESS" | "FAMILY_CENTER_TEEN_ACTIVITY_MORE_FETCH_SUCCESS" | "FETCH_PRIVATE_CHANNEL_INTEGRATIONS_SUCCESS" | "FRIEND_SUGGESTION_CREATE" | "GIFT_CODE_RESOLVE_SUCCESS" | "GUILD_APPLIED_BOOSTS_FETCH_SUCCESS" | "GUILD_BAN_ADD" | "GUILD_BAN_REMOVE" | "GUILD_CREATE" | "GUILD_FEED_FETCH_SUCCESS" | "GUILD_JOIN_REQUEST_CREATE" | "GUILD_JOIN_REQUEST_UPDATE" | "GUILD_MEMBERS_CHUNK_BATCH" | "GUILD_MEMBER_ADD" | "GUILD_MEMBER_LIST_UPDATE" | "GUILD_MEMBER_UPDATE" | "GUILD_SCHEDULED_EVENT_USERS_FETCH_SUCCESS" | "GUILD_SETTINGS_LOADED_BANS" | "GUILD_SETTINGS_LOADED_BANS_BATCH" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_FORUM_POSTS" | "LOAD_FRIEND_SUGGESTIONS_SUCCESS" | "LOAD_MESSAGES_AROUND_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_MESSAGE_REQUESTS_SUPPLEMENTAL_DATA_SUCCESS" | "LOAD_NOTIFICATION_CENTER_ITEMS_SUCCESS" | "LOAD_PINNED_MESSAGES_SUCCESS" | "LOAD_RECENT_MENTIONS_SUCCESS" | "LOAD_RELATIONSHIPS_SUCCESS" | "LOAD_THREADS_SUCCESS" | "LOCAL_MESSAGES_LOADED" | "MEMBER_SAFETY_GUILD_MEMBER_SEARCH_SUCCESS" | "MESSAGE_CREATE" | "MESSAGE_UPDATE" | "MOD_VIEW_SEARCH_FINISH" | "NOTIFICATION_CENTER_ITEM_CREATE" | "OVERLAY_INITIALIZE" | "PASSIVE_UPDATE_V1" | "PRESENCE_UPDATES" | "PRIVATE_CHANNEL_INTEGRATION_CREATE" | "PRIVATE_CHANNEL_INTEGRATION_UPDATE" | "RELATIONSHIP_ADD" | "SEARCH_FINISH" | "THREAD_LIST_SYNC" | "THREAD_MEMBERS_UPDATE" | "THREAD_MEMBER_LIST_UPDATE" | "UPDATE_CLIENT_PREMIUM_TYPE" | "USER_UPDATE">;

export class UserStore extends FluxSnapshotStore<typeof UserStore, UserStoreSnapshotData, UserStoreAction> {
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
