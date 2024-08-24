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

import type { UserJSON } from "@api/Commands";
import type { ChannelRecord, DisplayProfile, DMChannelRecord, GuildMember, GuildRecord, StatusType, UserProfileStore, UserRecord, UserStore } from "@vencord/discord-types";
import type { ExpressionPickerViewType } from "@webpack/common";
import type { ReactNode } from "react";

export type MarkupUtils = Record<
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

export interface Alert {
    body: ReactNode;
    cancelText?: string;
    className?: string;
    confirmColor?: string;
    confirmText?: string;
    onCancel?: () => void;
    onCloseCallback?: () => void;
    onConfirm?: () => void;
    onConfirmSecondary?: () => void;
    secondaryConfirmText?: string;
    title?: string;
    titleClassName?: string;
}

export interface AlertActionCreators {
    /** This is a noop; it does nothing. */
    close: () => void;
    confirm: (alert: Alert) => Promise<boolean>;
    show: (alert: Alert) => void;
}

export interface SnowflakeUtils {
    fromTimestamp: (timestamp: number) => string;
    extractTimestamp: (snowflake: string) => number;
    age: (snowflake: string) => number;
    atPreviousMillisecond: (snowflake: string) => string;
    compare: (snowflake1?: string, snowflake2?: string) => number;
}

interface RestRequestData {
    url: string;
    query?: Record<string, any>;
    body?: Record<string, any>;
    oldFormErrors?: boolean;
    retries?: number;
}

export type RestAPI = Record<"del" | "get" | "patch" | "post" | "put", (data: RestRequestData) => Promise<any>>;

export type PermissionsKeys = "CREATE_INSTANT_INVITE" | "KICK_MEMBERS" | "BAN_MEMBERS" | "ADMINISTRATOR" | "MANAGE_CHANNELS" | "MANAGE_GUILD" | "ADD_REACTIONS" | "VIEW_AUDIT_LOG" | "PRIORITY_SPEAKER" | "STREAM" | "VIEW_CHANNEL" | "SEND_MESSAGES" | "SEND_TTS_MESSAGES" | "MANAGE_MESSAGES" | "EMBED_LINKS" | "ATTACH_FILES" | "READ_MESSAGE_HISTORY" | "MENTION_EVERYONE" | "USE_EXTERNAL_EMOJIS" | "VIEW_GUILD_ANALYTICS" | "CONNECT" | "SPEAK" | "MUTE_MEMBERS" | "DEAFEN_MEMBERS" | "MOVE_MEMBERS" | "USE_VAD" | "CHANGE_NICKNAME" | "MANAGE_NICKNAMES" | "MANAGE_ROLES" | "MANAGE_WEBHOOKS" | "MANAGE_GUILD_EXPRESSIONS" | "USE_APPLICATION_COMMANDS" | "REQUEST_TO_SPEAK" | "MANAGE_EVENTS" | "MANAGE_THREADS" | "CREATE_PUBLIC_THREADS" | "CREATE_PRIVATE_THREADS" | "USE_EXTERNAL_STICKERS" | "SEND_MESSAGES_IN_THREADS" | "USE_EMBEDDED_ACTIVITIES" | "MODERATE_MEMBERS" | "VIEW_CREATOR_MONETIZATION_ANALYTICS" | "USE_SOUNDBOARD" | "CREATE_GUILD_EXPRESSIONS" | "CREATE_EVENTS" | "USE_EXTERNAL_SOUNDS" | "SEND_VOICE_MESSAGES" | "USE_CLYDE_AI" | "SET_VOICE_CHANNEL_STATUS" | "SEND_POLLS" | "USE_EXTERNAL_APPS";

export type Permissions = Record<PermissionsKeys, bigint>;

export interface ClipboardUtils {
    copy: (text: string) => void;
    SUPPORTS_COPY: boolean;
}

export interface RouterUtils {
    back: () => void;
    forward: () => void;
    transitionTo: (path: string, ...args: unknown[]) => void;
    transitionToGuild: (guildId: string, ...args: unknown[]) => void;
}

export interface IconUtils {
    getUserAvatarURL: (user: UserRecord, canAnimate?: boolean, size?: number, format?: string) => string;
    getDefaultAvatarURL: (id: string, discriminator?: string) => string;
    getUserBannerURL: (data: { id: string; banner: string; canAnimate?: boolean; size: number; }) => string | undefined;
    getAvatarDecorationURL: (data: { avatarDecoration: string; size: number; canCanimate?: boolean; }) => string | undefined;

    getGuildMemberAvatarURL: (member: GuildMember, canAnimate?: string) => string | null;
    getGuildMemberAvatarURLSimple: (data: { guildId: string; userId: string; avatar: string; canAnimate?: boolean; size?: number; }) => string;
    getGuildMemberBannerURL: (data: { id: string; guildId: string; banner: string; canAnimate?: boolean; size: number; }) => string | undefined;

    getGuildIconURL: (data: { id: string; icon?: string; size?: number; canAnimate?: boolean; }) => string | undefined;
    getGuildBannerURL: (guild: GuildRecord, canAnimate?: boolean) => string | null;

    getChannelIconURL: (data: { id: string; icon?: string | null; applicationId?: string; size?: number; }) => string | undefined;
    getEmojiURL: (data: { id: string; animated: boolean; size: number; forcePNG?: boolean; }) => string;

    hasAnimatedGuildIcon: (guild: GuildRecord) => boolean;
    isAnimatedIconHash: (hash: string) => boolean;

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

export interface Constants {
    Endpoints: Record<string, any>;
    UserFlags: Record<string, number>;
    FriendsSections: Record<string, string>;
}

export interface ExpressionPickerStoreState {
    activeView: ExpressionPickerStoreState | null;
    activeViewType: any | null;
    isSearchSuggestion: boolean;
    lastActiveView: ExpressionPickerStoreState | null;
    pickerId: string;
    searchQuery: string;
}

// zustand store
export interface ExpressionPickerStore {
    closeExpressionPicker: (activeViewType?: Record<string, any> | null) => void;
    openExpressionPicker: (
        activeView: ExpressionPickerViewType | null,
        activeViewType: Record<string, any> | null
    ) => void;
    toggleExpressionPicker: (activeView: ExpressionPickerViewType, activeViewType?: any) => void;
    toggleMultiExpressionPicker: (activeViewType?: any) => void;
    setExpressionPickerView: (activeView: ExpressionPickerViewType) => void;
    setSearchQuery: (searchQuery: string, isSearchSuggestion?: boolean) => void;
    useExpressionPickerStore: {
        <T>(selector: (state: ExpressionPickerStoreState) => T): T;
        (): ExpressionPickerStoreState;
    };
}

export interface BrowserWindowFeatures {
    toolbar?: boolean;
    menubar?: boolean;
    location?: boolean;
    directories?: boolean;
    width?: number;
    height?: number;
    defaultWidth?: number;
    defaultHeight?: number;
    left?: number;
    top?: number;
    defaultAlwaysOnTop?: boolean;
    movable?: boolean;
    resizable?: boolean;
    frame?: boolean;
    alwaysOnTop?: boolean;
    hasShadow?: boolean;
    transparent?: boolean;
    skipTaskbar?: boolean;
    titleBarStyle?: string | null;
    backgroundColor?: string;
}

export interface PopoutWindowActionCreators {
    close: (key: string) => Promise<void>;
    open: (
        key: string,
        render: (windowKey: string) => ReactNode,
        features?: BrowserWindowFeatures
    ) => Promise<void>;
    setAlwaysOnTop: (key: string, alwaysOnTop: boolean) => Promise<void>;
}

export type UserUtilsTagInclude = "always" | "auto" | "never";
export interface UserUtilsTagOptions {
    decoration?: UserUtilsTagInclude | undefined;
    forcePomelo?: boolean | undefined;
    identifiable?: UserUtilsTagInclude | undefined;
    mode?: "full" | "username" | undefined;
}

export interface UserUtils {
    getFormattedName: (
        user?: UserRecord | UserJSON | null,
        useTagInsteadOfUsername?: boolean /* = false */
    ) => string;
    getGlobalName: (user?: UserRecord | UserJSON | null) => string | undefined;
    getName: <User extends UserRecord | UserJSON | null | undefined>(user: User) => User extends {} ? string : undefined;
    getUserTag: (user?: UserRecord | UserJSON | null, options?: UserUtilsTagOptions) => string;
    humanizeStatus: <Status extends string>(
        status: Status,
        mobile?: boolean /* = false */
    ) => Status extends Exclude<StatusType, StatusType.UNKNOWN> ? string : null;
    useDirectMessageRecipient: <Channel extends ChannelRecord | null | undefined>(channel: Channel) => Channel extends {}
        ? Channel extends DMChannelRecord ? UserRecord | undefined : null : undefined;
    useName: <User extends UserRecord | UserJSON | null | undefined>(user: User) => User extends {} ? string : undefined;
    useUserTag: (user?: UserRecord | UserJSON | null, options?: UserUtilsTagOptions) => string;
}

export interface DisplayProfileUtils {
    getDisplayProfile: (
        userId: string,
        guildId?: string | null,
        stores?: [
            Pick<UserStore, "getUser">,
            Pick<UserProfileStore, "getGuildMemberProfile" | "getUserProfile">
        ] /* = [UserStore, UserProfileStore] */
    ) => DisplayProfile | null;
    useDisplayProfile: (userId: string, guildId?: string | null) => DisplayProfile | null;
}
