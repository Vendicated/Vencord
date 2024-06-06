/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { MessageRecord } from "./MessageRecord";

export class MessageCache {
    constructor(isCacheBefore: boolean);

    cache(messages: MessageRecord[], wasAtEdge?: boolean | undefined /* = false */): void;
    clear(): void;
    clone(): MessageCache;
    extract(count: number): MessageRecord[];
    extractAll(): MessageRecord[];
    forEach(
        callback: (value: MessageRecord, index: number, array: MessageRecord[]) => void,
        thisArg?: unknown
    ): void;
    get(messageId: string): MessageRecord | undefined;
    has(messageId: string): boolean;
    get length(): number;
    remove(messageId: string): void;
    removeMany(messageIds: string[]): void;
    replace(messageId: string, message: MessageRecord): void;
    update(messageId: string, updater: (message: MessageRecord) => MessageRecord): void;
    get wasAtEdge(): boolean;
    set wasAtEdge(wasAtEdge: boolean);

    _isCacheBefore: boolean;
    _map: { [messageId: string]: MessageRecord; };
    _messages: MessageRecord[];
    _wasAtEdge: boolean;
}
