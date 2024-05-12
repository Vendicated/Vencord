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

import { DraftType } from "@webpack/common";
import { Channel, Guild, Role } from "discord-types/general";

import type { FluxActionHandlers, FluxActionType, FluxDispatcher, FluxPayload } from "./utils";

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
    Dispatcher extends FluxDispatcher<infer P> = FluxDispatcher,
    Payload = P<infer A>,
    ActionType = A
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
    mustEmitChanges(mustEmitChanges?: ((payload: Payload) => boolean) | Nullish /* = () => true */): void;
    registerActionHandlers(actionHandlers: FluxActionHandlers<ActionType>, band?: number | Nullish): void;
    syncWith(stores: FluxStore<Dispatcher>[], func: () => boolean | void, delay?: number | Nullish);
    waitFor(...stores: FluxStore<Dispatcher>[]): void;

    __getLocalVars: undefined;
    _changeCallbacks: FluxChangeListeners;
    _dispatcher: Dispatcher;
    _dispatchToken: string;
    _isInitialized: boolean;
    _mustEmitChanges: ((payload: Payload) => boolean) | Nullish;
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

export interface Flux {
    Store: typeof FluxStore;
}

export type useStateFromStores = <T>(
    stores: FluxStore[],
    getStateFromStores: () => T,
    dependencies?: any[] | null | undefined,
    areStatesEqual?: ((prevState: T, currState: T) => boolean) | undefined
) => T;

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

export class User {
    constructor(user: object); // TEMP

    addGuildAvatarHash(guildId: string, avatarHash: string): User;
    get avatarDecoration(): {
        asset: string;
        skuId: string;
    } | null;
    set avatarDecoration(avatarDecoration: {
        asset: string;
        skuId: string;
    } | null): void;
    get createdAt(): Date;
    getAvatarSource(guildId?: string | Nullish, canAnimate?: boolean | undefined): { uri: string; };
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
    removeGuildAvatarHash(guildId: string): User;
    get tag(): string;
    toString(): string;

    avatar: string;
    avatarDecorationData: {
        asset: string;
        skuId: string;
    } | null;
    bot: boolean;
    clan: null; // TEMP
    desktop: boolean;
    discriminator: string;
    email: string | null;
    flags: number;
    globalName: string | null;
    guildMemberAvatars: Record<string, string>;
    hasAnyStaffLevel: () => boolean;
    hasBouncedEmail: boolean;
    hasFlag: (flag: number) => boolean;
    id: string;
    isStaff: () => boolean;
    isStaffPersonal: () => boolean;
    mfaEnabled: boolean;
    mobile: boolean;
    nsfwAllowed: boolean | null;
    personalConnectionId: string | null;
    phone: string | null;
    premiumType: number | null | undefined;
    premiumUsageFlags: number;
    publicFlags: number;
    purchasedFlags: number;
    system: boolean;
    username: string;
    verified: boolean;
}

export class UserStore extends FluxStore {
    static displayName: "UserStore";
    static LATEST_SNAPSHOT_VERSION: number;

    filter(predicate: (user: User) => any): User[];
    findByTag(username: string, discriminator?: string | Nullish): User | undefined;
    forEach(callback: (user: User) => void): void;
    getCurrentUser(): User /* | undefined */;
    getUser(userId: string): User | undefined;
    getUsers(): Record<string, User>;
    getUserStoreVersion(): number;
    handleLoadCache(arg: object): void; // TEMP
    takeSnapshot(): {
        data: { users: [User] | []; };
        version: number;
    };
}

export interface UserProfile {
    application: null; // TEMP
    accentColor: number | null;
    applicationRoleConnections: []; // TEMP
    badges: {
        description: string;
        icon: string;
        id: string;
        link?: string;
    }[];
    banner: string | null | undefined;
    bio: string;
    connectedAccounts: {
        id: string;
        metadata?: Record<string, any>;
        name: string;
        type: string;
        verified: boolean;
    }[];
    lastFetched: number;
    legacyUsername: string | null;
    popoutAnimationParticleType?: null | undefined; // TEMP
    premiumGuildSince: Date | null;
    premiumSince: Date | null;
    premiumType: number | null | undefined;
    profileEffectId: string | undefined;
    profileFetchFailed: boolean;
    pronouns: string;
    themeColors?: [primaryColor: number, accentColor: number] | undefined;
    userId: string;
}

export class UserProfileStore extends FluxStore {
    static displayName: "UserProfileStore";
    static LATEST_SNAPSHOT_VERSION: number;

    getUserProfile(userId: string): UserProfile | undefined;
    getGuildMemberProfile<T extends string | Nullish>(userId: string, guildId: T): T extends Nullish ? null : object | undefined; // TEMP
    getIsAccessibilityTooltipViewed(): boolean;
    getMutualFriends(userId: string): object; // TEMP
    getMutualFriendsCount(userId: string): number;
    getMutualGuilds(userId: string): object; // TEMP
    isFetchingFriends(userId: string): boolean;
    isFetchingProfile(userId: string): boolean;
    get isSubmitting(): boolean;
    takeSnapshot(): {
        data: {
            userId: string;
            profile: UserProfile | undefined;
        };
        version: number;
    };

    loadCache: () => void;
}

export class WindowStore extends FluxStore {
    isElementFullScreen(): boolean;
    isFocused(): boolean;
    windowSize(): Record<"width" | "height", number>;
}
