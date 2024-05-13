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

import type { DraftType } from "@webpack/common";
import type { APIUser, ApplicationFlags, OAuth2Scopes, UserFlags, UserPremiumType } from "discord-api-types/v9";
import type { Channel, Guild, Role } from "discord-types/general"; // TODO

import type { FluxAction, FluxActionHandlers, FluxActionType, FluxDispatchBand, FluxDispatcher } from "./utils";

type Nullish = null | undefined;

type FluxChangeListener = () => boolean;

class FluxChangeListeners {
    has(listener: FluxChangeListener): boolean;
    hasAny(): boolean;
    invokeAll(): void;

    add: (listener: FluxChangeListener) => void;
    addConditional: (listener: FluxChangeListener, immediatelyCall?: boolean | undefined /* = true */) => void;
    listeners: Set<FluxChangeListener>;
    remove: (listener: FluxChangeListener) => void;
}

export class FluxStore<
    Dispatcher extends FluxDispatcher<infer A> = FluxDispatcher,
    Action = A<infer T>,
    ActionType = T
> {
    constructor(
        dispatcher: Dispatcher,
        actionHandlers: FluxActionHandlers<ActionType>,
        band?: number | Nullish
    );

    static displayName: undefined;
    static initialized: Promise<undefined>;
    static destroy(): void;
    static getAll(): FluxStore[];
    static initialize(): void;

    emitChange(): void;
    getDispatchToken(): string;
    getName(): string;
    initialize(): void;
    initializeIfNeeded(): void;
    mustEmitChanges(mustEmitChanges?: ((action: Action) => boolean) | Nullish /* = () => true */): void;
    registerActionHandlers(actionHandlers: FluxActionHandlers<ActionType>, band?: FluxDispatchBand | Nullish): void;
    syncWith(stores: FluxStore<Dispatcher>[], func: () => boolean | void, timeout?: number | Nullish): void;
    waitFor(...stores: FluxStore<Dispatcher>[]): void;

    __getLocalVars: undefined;
    _changeCallbacks: FluxChangeListeners;
    _dispatcher: Dispatcher;
    _dispatchToken: string;
    _isInitialized: boolean;
    _mustEmitChanges: ((action: Action) => boolean) | Nullish;
    _reactChangeCallbacks: FluxChangeListeners;
    _syncWiths: {
        func: () => boolean | void;
        store: FluxStore<Dispatcher>;
    }[];
    addChangeListener: FluxChangeListeners["add"];
    addConditionalChangeListener: FluxChangeListeners["addConditional"];
    addReactChangeListener: FluxChangeListeners["add"];
    removeChangeListener: FluxChangeListeners["remove"];
    removeReactChangeListener: FluxChangeListeners["remove"];
}

type FluxSnapshotStoreActionType = Exclude<FluxActionType, "CLEAR_CACHES" | "WRITE_CACHES">;

interface FluxSnapshot<Data = any> {
    data: Data;
    version: number;
}

export class FluxSnapshotStore<
    Constructor extends typeof FluxSnapshotStore,
    SnapshotData = any,
    Action extends FluxAction<FluxSnapshotStoreActionType> = FluxAction<FluxSnapshotStoreActionType>
> extends FluxStore<FluxDispatcher<Action>> {
    constructor(actionHandlers: FluxActionHandlers<Action>);

    static allStores: FluxSnapshotStore[];
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

export type useStateFromStores = <T>(
    stores: FluxStore[],
    getStateFromStores: () => T,
    dependencies?: any[] | Nullish,
    areStatesEqual?: ((prevState: T, currState: T) => boolean) | undefined
) => T;

// Original name: Record, renamed to avoid conflict with the Record util type
export class ImmutableRecord<OwnProperties extends object = Record<PropertyKey, any>> {
    merge(collection: Partial<OwnProperties>): this;
    set<K extends keyof OwnProperties>(key: K, value: OwnProperties[K]): this;
    toJS(): OwnProperties;
    update<K extends keyof OwnProperties>(
        key: K,
        updater: (value: OwnProperties[K]) => OwnProperties[K]
    ): this;
    update<K extends keyof OwnProperties>(
        key: K,
        notSetValue: OwnProperties[K],
        updater: (value: OwnProperties[K]) => OwnProperties[K]
    ): this;
}

export interface DraftObject {
    channelId: string;
    timestamp: number;
    draft: string;
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

export class GuildStore extends FluxStore {
    getGuild(guildId: string): Guild;
    getGuildCount(): number;
    getGuilds(): Record<string, Guild>;
    getGuildIds(): string[];
    getRole(guildId: string, roleId: string): Role;
    getRoles(guildId: string): Record<string, Role>;
    getAllGuildRoles(): Record<string, Record<string, Role>>;
}

enum ApplicationIntegrationType {
    GUILD_INSTALL,
    USER_INSTALL
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
    premiumType: UserPremiumType | Nullish;
    profileEffectId: string | undefined;
    profileFetchFailed: false;
    pronouns: string;
    themeColors: [primaryColor: number, accentColor: number] | Nullish;
    userId: string;
}

export type UserProfile<FetchFailed extends boolean = boolean> = FetchFailed extends true
    ? UserProfileFetchFailed
    : UserProfileFetchSucceeded;

interface UserProfileStoreSnapshotData {
    userId: string;
    profile: UserProfile | undefined;
}

export class UserProfileStore extends FluxSnapshotStore<typeof UserProfileStore, UserProfileStoreSnapshotData> {
    static displayName: "UserProfileStore";
    static LATEST_SNAPSHOT_VERSION: number;

    getUserProfile<FetchFailed extends boolean = boolean>(userId: string): UserProfile<FetchFailed> | undefined;
    getGuildMemberProfile<T extends string | Nullish>(userId: string, guildId: T): T extends Nullish ? null : any | undefined; // TEMP
    getIsAccessibilityTooltipViewed(): boolean;
    getMutualFriends(userId: string): any; // TEMP
    getMutualFriendsCount(userId: string): number;
    getMutualGuilds(userId: string): any; // TEMP
    isFetchingFriends(userId: string): boolean;
    isFetchingProfile(userId: string): boolean;
    get isSubmitting(): boolean;
    takeSnapshot(): FluxSnapshot<UserProfileStoreSnapshotData>;

    loadCache: () => void;
}

interface AvatarDecorationData {
    asset: string;
    skuId: string;
}

type UserRecordOwnProperties = Pick<UserRecord, "avatar" | "avatarDecorationData" | "bot" | "clan" | "desktop" | "discriminator" | "email" | "flags" | "globalName" | "guildMemberAvatars" | "hasAnyStaffLevel" | "hasBouncedEmail" | "hasFlag" | "id" | "isStaff" | "isStaffPersonal" | "mfaEnabled" | "mobile" | "nsfwAllowed" | "personalConnectionId" | "phone" | "premiumType" | "premiumUsageFlags" | "publicFlags" | "purchasedFlags" | "system" | "username" | "verified">;

export class UserRecord extends ImmutableRecord<UserRecordOwnProperties> {
    constructor(userFromServer: APIUser);

    addGuildAvatarHash(guildId: string, avatarHash: string): this;
    get avatarDecoration(): AvatarDecorationData | null;
    set avatarDecoration(avatarDecorationData: {
        asset: string;
        skuId?: string;
        sku_id?: string;
    } | null): void;
    get createdAt(): Date;
    getAvatarSource(guildId?: string | Nullish, canAnimate?: boolean | undefined, avatarSize?: number | undefined): { uri: string; };
    getAvatarURL(guildId?: string | Nullish, avatarSize?: number | undefined, canAnimate?: boolean | undefined): string;
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
    premiumType: UserPremiumType | Nullish; // discord seems to have recently made it so that premiumType is nullish for every UserRecord
    premiumUsageFlags: number;
    publicFlags: UserFlags;
    purchasedFlags: number;
    system: boolean;
    username: string;
    verified: boolean;
}

interface UserStoreSnapshotData { users: [UserRecord] | []; }

export class UserStore extends FluxSnapshotStore<typeof UserStore, UserStoreSnapshotData> {
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
