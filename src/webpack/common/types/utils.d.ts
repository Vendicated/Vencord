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

import type { ReactNode } from "react";

import type { FluxEvents } from "./fluxEvents";

export { FluxEvents };

export interface FluxDispatcher {
    _actionHandlers: any;
    _subscriptions: any;
    dispatch(event: { [key: string]: unknown; type: FluxEvents; }): Promise<void>;
    isDispatching(): boolean;
    subscribe(event: FluxEvents, callback: (data: any) => void): void;
    unsubscribe(event: FluxEvents, callback: (data: any) => void): void;
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
> & Record<"defaultRules" | "guildEventRules", Record<string, Record<"react" | "html" | "parse" | "match" | "order", any>>> & {
    parseToAST(content: string): ParserNode[];
};

export type ParserNode = TextNode | LinkNode | BlockQuoteNode;

export interface LinkNode {
    type: "link";
    target: string;
    content: ParserNode[];
}

export interface BlockQuoteNode {
    type: "blockquote";
    content: ParserNode[];
}

export interface TextNode {
    type: "text";
    content: string;
}

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
    compare(snowflake1: string, snowflake2: string): number;
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
