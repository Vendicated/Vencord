/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { ChannelMessages } from "../general/messages/ChannelMessages";
import type { MessageRecord } from "../general/messages/MessageRecord";
import type { Nullish } from "../internal";
import type { FluxStore } from "./abstract/FluxStore";

export type MessageStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC_CHANNEL_MESSAGES" | "CACHE_LOADED" | "CHANNEL_DELETE" | "CLEAR_MESSAGES" | "CONNECTION_OPEN" | "GUILD_DELETE" | "GUILD_MEMBERS_CHUNK_BATCH" | "LOAD_MESSAGES" | "LOAD_MESSAGES_FAILURE" | "LOAD_MESSAGES_SUCCESS" | "LOAD_MESSAGES_SUCCESS_CACHED" | "LOAD_MESSAGE_INTERACTION_DATA_SUCCESS" | "LOCAL_MESSAGES_LOADED" | "LOCAL_MESSAGE_CREATE" | "LOGOUT" | "MESSAGE_CREATE" | "MESSAGE_DELETE" | "MESSAGE_DELETE_BULK" | "MESSAGE_EDIT_FAILED_AUTOMOD" | "MESSAGE_EXPLICIT_CONTENT_SCAN_TIMEOUT" | "MESSAGE_REACTION_ADD" | "MESSAGE_REACTION_ADD_MANY" | "MESSAGE_REACTION_REMOVE" | "MESSAGE_REACTION_REMOVE_ALL" | "MESSAGE_REACTION_REMOVE_EMOJI" | "MESSAGE_REVEAL" | "MESSAGE_SEND_FAILED" | "MESSAGE_SEND_FAILED_AUTOMOD" | "MESSAGE_UPDATE" | "OVERLAY_INITIALIZE" | "RELATIONSHIP_ADD" | "RELATIONSHIP_REMOVE" | "THREAD_CREATE_LOCAL" | "THREAD_DELETE" | "THREAD_MEMBER_LIST_UPDATE" | "TRUNCATE_MESSAGES" | "UPLOAD_FAIL" | "UPLOAD_START">;

export class MessageStore<Action extends FluxAction = MessageStoreAction> extends FluxStore<Action> {
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
