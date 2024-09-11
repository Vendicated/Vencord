/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish, Optional } from "../../internal";
import type { MessageCache } from "./MessageCache";
import type { MessageProperties, MessageRecord } from "./MessageRecord";

export type ChannelMessagesOwnProperties = Pick<ChannelMessages, "_after" | "_array" | "_before" | "_map" | "cached" | "channelId" | "error" | "focusTargetId" | "hasFetched" | "hasMoreAfter" | "hasMoreBefore" | "jumped" | "jumpedToPresent" | "jumpFlash" | "jumpReturnTargetId" | "jumpSequenceId" | "jumpTargetId" | "jumpTargetOffset" | "jumpType" | "loadingMore" | "ready" | "revealedMessageId">;

export declare class ChannelMessages {
    constructor(channelId: string);

    static _channelMessages: { [channelId: string]: ChannelMessages; };
    static clear(channelId: string): void;
    static clearCache(channelId: string): void;
    static commit(channelMessages: ChannelMessages): void;
    /**
     * @param callback The iteratee. Iteration will terminate early if it returns false.
     */
    static forEach(callback: (value: ChannelMessages, index: number, array: ChannelMessages[]) => unknown): void;
    static get(channelId: string): ChannelMessages | undefined;
    static getOrCreate(channelId: string): ChannelMessages;
    static hasPresent(channelId: string): boolean;

    _clearMessages(): void;
    _merge(
        messages: readonly MessageRecord[],
        isBefore?: boolean /* = false */,
        clearCache?: boolean /* = false */
    ): void;
    /** @throws {Error} `messages` must be sorted in descending order by ID. */
    addCachedMessages(messages: readonly MessageRecord[], cached: boolean): ChannelMessages;
    filter<T extends MessageRecord>(
        predicate: (value: MessageRecord, index: number, array: MessageRecord[]) => value is T,
        thisArg?: unknown
    ): T[];
    filter(
        predicate: (value: MessageRecord, index: number, array: MessageRecord[]) => unknown,
        thisArg?: unknown
    ): MessageRecord[];
    findNewest<T extends MessageRecord>(
        predicate: (value: MessageRecord, index: number, array: MessageRecord[]) => value is T
    ): T | undefined;
    findNewest(
        predicate: (value: MessageRecord, index: number, array: MessageRecord[]) => unknown
    ): MessageRecord | undefined;
    findOldest<T extends MessageRecord>(
        predicate: (value: MessageRecord, index: number, array: MessageRecord[]) => value is T
    ): T | undefined;
    findOldest(
        predicate: (value: MessageRecord, index: number, array: MessageRecord[]) => unknown
    ): MessageRecord | undefined;
    first(): MessageRecord | undefined;
    focusOnMessage(messageId: string): ChannelMessages;
    forAll(
        callback: (value: MessageRecord, index: number, array: MessageRecord[]) => void,
        thisArg?: unknown
    ): void;
    forEach<BreakOnReturnFalse extends boolean | undefined = undefined>(
        callback: (value: MessageRecord, index: number, array: MessageRecord[]) =>
        [BreakOnReturnFalse] extends [false | undefined]
            // https://github.com/typescript-eslint/typescript-eslint/issues/8113
            // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
            ? void
            : unknown,
        thisArg?: unknown,
        breakOnReturnFalse?: BreakOnReturnFalse
    ): void;
    get(messageId: string, searchCaches?: boolean /* = false */): MessageRecord | undefined;
    getAfter(messageId: string): MessageRecord | null;
    getByIndex(index: number): MessageRecord | undefined;
    /** If count is -1, all results will be returned. */
    getManyAfter(
        messageId: string,
        count: number,
        callback?: ((message: MessageRecord) => void) | null
    ): MessageRecord[] | null;
    /** If count is -1, all results will be returned. */
    getManyBefore(
        messageId: string,
        count: number,
        callback?: ((message: MessageRecord) => void) | null
    ): MessageRecord[] | null;
    has(messageId: string, searchCaches?: boolean): boolean;
    hasAfterCached(messageId: string): boolean;
    hasBeforeCached(messageId: string): boolean;
    hasPresent(): boolean;
    indexOf(messageId: string): number;
    jumpToMessage(
        messageId: string | null,
        jumpFlash?: boolean /* = true */,
        jumpTargetOffset?: number | null,
        jumpReturnTargetId?: string | null,
        jumpType?: JumpType | null /* = JumpType.ANIMATED */
    ): ChannelMessages;
    jumpToPresent(countFromPresent: number): ChannelMessages;
    last(): MessageRecord | undefined;
    get length(): number;
    loadComplete(messageProperties: MessageProperties): ChannelMessages;
    loadFromCache(isBefore: boolean, extractCount: number): ChannelMessages;
    loadStart(jumpConfig?: {
        messageId?: string | Nullish;
        offset?: number | Nullish;
        present?: boolean | Nullish;
        returnMessageId?: string | Nullish;
    } | null): ChannelMessages;
    map<T>(
        callback: (value: MessageRecord, index: number, array: MessageRecord[]) => T,
        thisArg?: unknown
    ): T[];
    merge(
        messages: readonly MessageRecord[],
        isBefore?: boolean /* = false */,
        clearCache?: boolean /* = false */
    ): ChannelMessages;
    mergeDelta(
        messages?: readonly MessageRecord[] /* = [] */,
        messageProperties?: readonly MessageProperties[] /* = [] */,
        excludedMessageIds?: readonly string[] /* = [] */
    ): ChannelMessages;
    mutate(
        mutaterOrObject?: ((channelMessages: ChannelMessages) => void)
            | Optional<Omit<ChannelMessagesOwnProperties, "_after" | "_array" | "_before" | "_map" | "channelId">>,
        deep?: boolean /* = false */
    ): ChannelMessages;
    receiveMessage(
        messageProperties: MessageProperties,
        truncateTop?: boolean /* = true */
    ): ChannelMessages | this;
    receivePushNotification(messageProperties: MessageProperties): ChannelMessages | this;
    receiveReactionInAppNotification(messageProperties: MessageProperties): ChannelMessages | this;
    reduce(
        callback: (
            previousValue: MessageRecord,
            currentValue: MessageRecord,
            currentIndex: number,
            array: MessageRecord[]
        ) => MessageRecord,
        initialValue?: MessageRecord
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
    remove(messageId: string): ChannelMessages;
    removeMany(messageIds: readonly string[]): ChannelMessages | this;
    replace(messageId: string, message: MessageRecord): ChannelMessages | this;
    reset(messages: MessageRecord[]): ChannelMessages;
    some(
        predicate: (value: MessageRecord, index: number, array: MessageRecord[]) => unknown,
        thisArg?: unknown
    ): boolean;
    toArray(): MessageRecord[];
    truncate(count: number, mutateDeep?: boolean /* = true */): ChannelMessages | this;
    truncateBottom(count: number, mutateDeep?: boolean /* = true */): ChannelMessages | this;
    truncateTop(count: number, mutateDeep?: boolean /* = true */): ChannelMessages | this;
    update(messageId: string, updater: (message: MessageRecord) => MessageRecord): ChannelMessages | this;

    _after: MessageCache;
    _array: MessageRecord[];
    _before: MessageCache;
    _map: { [messageId: string]: MessageRecord; };
    cached: boolean;
    channelId: string;
    error: boolean;
    focusTargetId: string | undefined;
    hasFetched: boolean;
    hasMoreAfter: boolean;
    hasMoreBefore: boolean;
    jumped: boolean;
    jumpedToPresent: boolean;
    jumpFlash: boolean;
    jumpReturnTargetId: string | Nullish;
    jumpSequenceId: number;
    jumpTargetId: string | null;
    jumpTargetOffset: number;
    jumpType: JumpType;
    loadingMore: boolean;
    ready: boolean;
    revealedMessageId: string | null;
}

// Original name: JumpTypes
export enum JumpType {
    ANIMATED = "ANIMATED",
    INSTANT = "INSTANT",
}
