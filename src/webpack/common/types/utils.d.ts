/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ReactNode } from "react";

import type { FluxEvents } from "./fluxEvents";
import { i18nMessages } from "./i18nMessages";

export { FluxEvents };

export interface FluxDispatcher {
    _actionHandlers: any;
    _subscriptions: any;
    dispatch(event: { [key: string]: unknown; type: FluxEvents; }): Promise<void>;
    isDispatching(): boolean;
    subscribe(event: FluxEvents, callback: (data: any) => void): void;
    unsubscribe(event: FluxEvents, callback: (data: any) => void): void;
    wait(callback: () => void): void;
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

export type RestAPI = Record<"delete" | "get" | "patch" | "post" | "put", (data: RestRequestData) => Promise<any>> & {
    V6OrEarlierAPIError: Error;
    V8APIError: Error;
    getAPIBaseURL(withVersion?: boolean): string;
};

export type Permissions = "CREATE_INSTANT_INVITE"
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

export type PermissionsBits = Record<Permissions, bigint>;

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

    Messages: Record<i18nMessages, string>;
}
