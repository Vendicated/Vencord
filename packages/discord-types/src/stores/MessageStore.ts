/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";
import type { ChannelMessages } from "../general/messages/ChannelMessages";
import type { MessageRecord } from "../general/messages/MessageRecord";
import type { Nullish } from "../internal";

export declare class MessageStore extends Store {
    static displayName: "MessageStore";

    focusedMessageId(channelId: string): string | undefined;
    getLastCommandMessage(channelId: string): MessageRecord | undefined;
    getLastEditableMessage(channelId: string): MessageRecord | undefined;
    getLastMessage(channelId: string): MessageRecord | undefined;
    getLastNonCurrentUserMessage(channelId: string): MessageRecord | undefined;
    getMessage(channelId: string, messageId: string): MessageRecord | undefined;
    getMessages(channelId: string): ChannelMessages;
    hasCurrentUserSentMessage(channelId: string): boolean;
    hasCurrentUserSentMessageSinceAppStart(): boolean;
    hasPresent(channelId: string): boolean;
    initialize(): void;
    isLoadingMessages(channelId: string): boolean;
    isReady(channelId: string): boolean;
    jumpedMessageId(channelId: string): string | Nullish;
    whenReady(channelId: string, callback: () => void): void;
}
