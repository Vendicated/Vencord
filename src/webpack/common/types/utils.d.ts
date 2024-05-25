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

import type { Guild, GuildMember } from "discord-types/general"; // TODO
import type { EventEmitter } from "events"; // Discord uses a polyfill for Node's EventEmitter
import type { ReactNode } from "react";

// import type { OmitIndexSignature } from "type-fest";
import type { ExcludeAction, ExtractAction, FluxAction, FluxActionType } from "./fluxActions";
import type { i18nMessages } from "./i18nMessages";

export type { ExcludeAction, ExtractAction, FluxAction, FluxActionType };

type Nullish = null | undefined;

declare class DepGraph<Data = any> {
    constructor(options?: { circular?: boolean | undefined; } | undefined);

    addDependency(from: string, to: string): void;
    addNode(name: string, data/* ?*/: Data/* | undefined*/): void;
    clone(): DepGraph<Data>;
    dependantsOf(name: string, leavesOnly?: boolean | undefined): string[];
    dependenciesOf(name: string, leavesOnly?: boolean | undefined): string[];
    getNodeData(name: string): Data;
    hasNode(name: string): Data;
    overallOrder(leavesOnly?: boolean | undefined): string[];
    removeDependency(from: string, to: string): void;
    removeNode(name: string): void;
    setNodeData(name: string, data/* ?*/: Data/* | undefined*/): void;
    size(): number;

    circular: boolean | undefined;
    nodes: Record<string, Data/* | string*/>;
    outgoingEdges: Record<string, string[]>;
    incomingEdges: Record<string, string[]>;
}

export const enum FluxDispatchBand {
    Early = 0,
    Database = 1,
    Default = 2
}

/*
export type FluxActionHandler<Action = FluxAction, Return = void> = Action extends FluxAction
    ? Exclude<keyof OmitIndexSignature<Action>, "type"> extends never
        ? (action: any) => Return
        : (action: Action) => Return
    : never;
*/

export type FluxActionHandler<Action extends FluxAction = FluxAction> = (action: Action) => void;

export type FluxActionHandlerMap<Action extends FluxAction = FluxAction>
    = { [ActionType in Action["type"]]: FluxActionHandler<ExtractAction<Action, ActionType>>; };

interface FluxActionHandlersGraphNode {
    name: string; // storeName
    band: FluxDispatchBand;
    actionHandler: FluxActionHandlerMap<FluxAction>;
    storeDidChange: FluxActionHandler<FluxAction>;
}

type FluxOrderedActionHandlers<Action extends FluxAction = FluxAction> = {
    name: string; // storeName
    actionHandler: FluxActionHandler<Action>;
    storeDidChange: FluxActionHandler<Action>;
}[];

declare class FluxActionHandlersGraph {
    _addToBand(dispatchToken: string, dispatchBand: FluxDispatchBand): void;
    _bandToken(dispatchBand: FluxDispatchBand): string;
    _computeOrderedActionHandlers<ActionType extends FluxActionType>(
        actionType: ActionType
    ): FluxOrderedActionHandlers<ExtractAction<FluxAction, ActionType>>[];
    _computeOrderedCallbackTokens(): string[];
    _invalidateCaches(): void;
    _validateDependencies(fromDispatchToken: string, toDispatchToken: string): void;
    addDependencies(fromDispatchToken: string, toDispatchTokens: string[]): void;
    createToken(): string;
    getOrderedActionHandlers<ActionType extends FluxActionType>({ type }: {
        type: ActionType;
    }): FluxOrderedActionHandlers<ExtractAction<FluxAction, ActionType>>;
    register<Action extends FluxAction>(
        storeName: string,
        actionHandlers: FluxActionHandlerMap<Action>,
        storeDidChange: FluxActionHandler<Action>,
        dispatchBand: FluxDispatchBand,
        dispatchToken?: string | undefined
    ): string;

    _dependencyGraph: DepGraph<FluxActionHandlersGraphNode>;
    _lastID: number;
    _orderedActionHandlers: {
        [ActionType in FluxActionType]?: FluxOrderedActionHandlers<ExtractAction<FluxAction, ActionType>> | Nullish;
    };
    _orderedCallbackTokens: string[] | Nullish;
}

interface SentryUtils {
    addBreadcrumb: (breadcrumb: {
        category?: string | undefined;
        data?: any;
        level?: string | undefined;
        message?: string | undefined;
        type?: string | undefined;
    }) => void;
}

type FluxActionMetric<ActionType extends FluxActionType = FluxActionType>
    = [storeName: string, actionType: ActionType, totalTime: number];

declare class FluxActionLog<Action extends FluxAction = FluxAction> {
    constructor(actionType: Action["type"]);

    get name(): Action["type"];
    toJSON(): Pick<this, "action" | "createdAt" | "traces"> & {
        created_at: FluxActionLog["createdAt"];
    };

    action: Action;
    createdAt: Date;
    error: Error | undefined;
    id: number;
    startTime: number;
    totalTime: number;
    traces: {
        name: string;
        time: number;
    }[];
}

declare class FluxActionLogger extends EventEmitter {
    constructor(options?: { persist?: boolean | undefined; } | undefined);

    getLastActionMetrics(
        title: string,
        limit?: number | undefined /* = 20 */
    ): FluxActionMetric[];
    getSlowestActions<ActionType extends FluxActionType = FluxActionType>(
        actionType?: ActionType | Nullish,
        limit?: number | undefined /* = 20 */
    ): FluxActionMetric<ActionType>[];
    log<Action extends FluxAction>(
        action: Action,
        callback: (func: <T>(storeName: string, func: () => T) => T) => void
    ): FluxActionLog<Action>;

    logs: FluxActionLog[];
    persist: boolean;
}

/*
 * The only reason to make Dispatcher generic with a type parameter for the actions it handles would be to allow plugins
 * to create their own Flux stores with their own actions. However, this would require removing all contravariant properties
 * from Dispatcher so that plugins could create stores with their own Dispatcher instances. This would be required, since
 * the alternative option, allowing plugins to use the main Dispatcher instance, would require removing type information for
 * Discord's actions from Dispatcher, and would introduce the potential for action type name conflicts. Both of these
 * options would harm the main use case of these types. Furthermore, there are other state management libraries bundled with
 * Discord that plugins can use (e.g., Redux, Zustand), and Discord seems to only use one Dispatcher instance (all ~398
 * stores use the same instance), implying that their type for Dispatcher is also not generic.
 */
export class FluxDispatcher {
    constructor(
        defaultBand?: FluxDispatchBand | undefined /* = FluxDispatchBand.Early */,
        actionLogger?: FluxActionLogger | Nullish,
        sentryUtils?: SentryUtils | Nullish
    );

    _dispatch(
        action: FluxAction,
        func: <T>(storeName: string, func: () => T) => T
    ): boolean | void;
    _dispatchWithDevtools(action: FluxAction): void;
    _dispatchWithLogging(action: FluxAction): void;
    addDependencies(fromDispatchToken: string, toDispatchTokens: string[]): void;
    addInterceptor(interceptor: FluxActionHandler): void;
    createToken(): string;
    dispatch(action: FluxAction): Promise<void>;
    flushWaitQueue(): void;
    isDispatching(): boolean;
    register<Action extends FluxAction>(
        storeName: string,
        actionHandlers: FluxActionHandlerMap<Action>,
        storeDidChange: FluxActionHandler<Action>,
        dispatchBand?: FluxDispatchBand | Nullish,
        dispatchToken?: string | undefined
    ): string;
    subscribe<ActionType extends FluxActionType>(
        actionType: ActionType,
        listener: FluxActionHandler<ExtractAction<FluxAction, ActionType>>
    ): void;
    unsubscribe<ActionType extends FluxActionType>(
        actionType: ActionType,
        listener: FluxActionHandler<ExtractAction<FluxAction, ActionType>>
    ): void;
    wait(callback: () => void): void;

    _actionHandlers: FluxActionHandlersGraph;
    _currentDispatchActionType: FluxActionType | Nullish;
    _defaultBand: FluxDispatchBand;
    _interceptors: ((action: FluxAction) => boolean)[];
    _processingWaitQueue: boolean;
    _sentryUtils: SentryUtils | Nullish;
    _subscriptions: {
        [ActionType in FluxActionType]?: Set<FluxActionHandler<ExtractAction<FluxAction, ActionType>>> | Nullish;
    };
    _waitQueue: (() => void)[];
    actionLogger: FluxActionLogger;
    functionCache: FluxActionHandlerMap<FluxAction>;
}

export type Parser = Record<
    | "parse"
    | "parseTopic"
    | "parseEmbedTitle"
    | "parseInlineReply"
    | "parseGuildVerificationFormRule"
    | "parseGuildEventDescription"
    | "parseAutoModerationSystemMessage"
    | "parseForumPostGuidelines"
    | "parseForumPostMostRecentMessage",
    (content: string, inline?: boolean, state?: Record<string, any>) => ReactNode[]
> & Record<"defaultRules" | "guildEventRules", Record<string, Record<"react" | "html" | "parse" | "match" | "order", any>>>;

export interface Alerts {
    show(alert: {
        title: any;
        body: React.ReactNode;
        className?: string;
        confirmColor?: string;
        cancelText?: string;
        confirmText?: string;
        secondaryConfirmText?: string;
        onCancel?(): void;
        onConfirm?(): void;
        onConfirmSecondary?(): void;
        onCloseCallback?(): void;
    }): void;
    /** This is a noop, it does nothing. */
    close(): void;
}

export interface SnowflakeUtils {
    fromTimestamp(timestamp: number): string;
    extractTimestamp(snowflake: string): number;
    age(snowflake: string): number;
    atPreviousMillisecond(snowflake: string): string;
    compare(snowflake1?: string, snowflake2?: string): number;
}

interface RestRequestData {
    url: string;
    query?: Record<string, any>;
    body?: Record<string, any>;
    oldFormErrors?: boolean;
    retries?: number;
}

export type RestAPI = Record<"delete" | "get" | "patch" | "post" | "put", (data: RestRequestData) => Promise<any>>;

export type PermissionKeys = "CREATE_INSTANT_INVITE"
    | "KICK_MEMBERS"
    | "BAN_MEMBERS"
    | "ADMINISTRATOR"
    | "MANAGE_CHANNELS"
    | "MANAGE_GUILD"
    | "CHANGE_NICKNAME"
    | "MANAGE_NICKNAMES"
    | "MANAGE_ROLES"
    | "MANAGE_WEBHOOKS"
    | "MANAGE_GUILD_EXPRESSIONS"
    | "CREATE_GUILD_EXPRESSIONS"
    | "VIEW_AUDIT_LOG"
    | "VIEW_CHANNEL"
    | "VIEW_GUILD_ANALYTICS"
    | "VIEW_CREATOR_MONETIZATION_ANALYTICS"
    | "MODERATE_MEMBERS"
    | "SEND_MESSAGES"
    | "SEND_TTS_MESSAGES"
    | "MANAGE_MESSAGES"
    | "EMBED_LINKS"
    | "ATTACH_FILES"
    | "READ_MESSAGE_HISTORY"
    | "MENTION_EVERYONE"
    | "USE_EXTERNAL_EMOJIS"
    | "ADD_REACTIONS"
    | "USE_APPLICATION_COMMANDS"
    | "MANAGE_THREADS"
    | "CREATE_PUBLIC_THREADS"
    | "CREATE_PRIVATE_THREADS"
    | "USE_EXTERNAL_STICKERS"
    | "SEND_MESSAGES_IN_THREADS"
    | "SEND_VOICE_MESSAGES"
    | "CONNECT"
    | "SPEAK"
    | "MUTE_MEMBERS"
    | "DEAFEN_MEMBERS"
    | "MOVE_MEMBERS"
    | "USE_VAD"
    | "PRIORITY_SPEAKER"
    | "STREAM"
    | "USE_EMBEDDED_ACTIVITIES"
    | "USE_SOUNDBOARD"
    | "USE_EXTERNAL_SOUNDS"
    | "REQUEST_TO_SPEAK"
    | "MANAGE_EVENTS"
    | "CREATE_EVENTS";

export type Permissions = Record<PermissionKeys, bigint>;

export interface Locale {
    name: string;
    value: string;
    localizedName: string;
}

export interface LocaleInfo {
    code: string;
    enabled: boolean;
    name: string;
    englishName: string;
    postgresLang: string;
}

export interface i18n {
    getAvailableLocales(): Locale[];
    getLanguages(): LocaleInfo[];
    getDefaultLocale(): string;
    getLocale(): string;
    getLocaleInfo(): LocaleInfo;
    setLocale(locale: string): void;

    loadPromise: Promise<void>;

    Messages: Record<i18nMessages, any>;
}

export interface Clipboard {
    copy(text: string): void;
    SUPPORTS_COPY: boolean;
}

export interface NavigationRouter {
    back(): void;
    forward(): void;
    hasNavigated(): boolean;
    getHistory(): {
        action: string;
        length: 50;
        [key: string]: any;
    };
    transitionTo(path: string, ...args: unknown[]): void;
    transitionToGuild(guildId: string, ...args: unknown[]): void;
    replaceWith(...args: unknown[]): void;
    getLastRouteChangeSource(): any;
    getLastRouteChangeSourceLocationStack(): any;
}

export interface IconUtils {
    // @ts-expect-error: TODO
    getUserAvatarURL(user: User, canAnimate?: boolean, size?: number, format?: string): string;
    getDefaultAvatarURL(id: string, discriminator?: string): string;
    getUserBannerURL(data: { id: string, banner: string, canAnimate?: boolean, size: number; }): string | undefined;
    getAvatarDecorationURL(dara: { avatarDecoration: string, size: number; canCanimate?: boolean; }): string | undefined;

    getGuildMemberAvatarURL(member: GuildMember, canAnimate?: string): string | null;
    getGuildMemberAvatarURLSimple(data: { guildId: string, userId: string, avatar: string, canAnimate?: boolean; size?: number; }): string;
    getGuildMemberBannerURL(data: { id: string, guildId: string, banner: string, canAnimate?: boolean, size: number; }): string | undefined;

    getGuildIconURL(data: { id: string, icon?: string, size?: number, canAnimate?: boolean; }): string | undefined;
    getGuildBannerURL(guild: Guild, canAnimate?: boolean): string | null;

    getChannelIconURL(data: { id: string; icon?: string; applicationId?: string; size?: number; }): string | undefined;
    getEmojiURL(data: { id: string, animated: boolean, size: number, forcePNG?: boolean; }): string;

    hasAnimatedGuildIcon(guild: Guild): boolean;
    isAnimatedIconHash(hash: string): boolean;

    getGuildSplashURL: any;
    getGuildDiscoverySplashURL: any;
    getGuildHomeHeaderURL: any;
    getResourceChannelIconURL: any;
    getNewMemberActionIconURL: any;
    getGuildTemplateIconURL: any;
    getApplicationIconURL: any;
    getGameAssetURL: any;
    getVideoFilterAssetURL: any;

    getGuildMemberAvatarSource: any;
    getUserAvatarSource: any;
    getGuildSplashSource: any;
    getGuildDiscoverySplashSource: any;
    makeSource: any;
    getGameAssetSource: any;
    getGuildIconSource: any;
    getGuildTemplateIconSource: any;
    getGuildBannerSource: any;
    getGuildHomeHeaderSource: any;
    getChannelIconSource: any;
    getApplicationIconSource: any;
    getAnimatableSourceWithFallback: any;
}
