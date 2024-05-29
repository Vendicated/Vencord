/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { MessageRecord } from "./MessageRecord";

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
    getByIndex(index: number): any /* | undefined */; // TEMP
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
        ) => MessageRecord,
        initialValue?: MessageRecord | undefined
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
    jumped: boolean;
    jumpedToPresent: boolean;
    jumpFlash: boolean;
    jumpReturnTargetId: string | null; // TEMP
    jumpSequenceId: number; // TEMP
    jumpTargetId: string | null; // TEMP
    jumpTargetOffset: number; // TEMP
    jumpType: JumpType;
    loadingMore: boolean;
    ready: boolean;
    revealedMessageId: string | null; // TEMP
}

export class MessageCache {
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

// Original name: JumpTypes
export const enum JumpType {
    ANIMATED = "ANIMATED",
    INSTANT = "INSTANT",
}
