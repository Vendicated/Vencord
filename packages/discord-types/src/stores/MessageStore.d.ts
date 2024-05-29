/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { Nullish } from "../internal";
import type { FluxStore } from "./abstract/FluxStore";

export type MessageStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC_CHANNEL_MESSAGES" | "CACHE_LOADED" | "CHANNEL_DELETE" | "CLEAR_MESSAGES" | "CONNECTION_OPEN" | "GUILD_DELETE" | "GUILD_MEMBERS_CHUNK_BATCH" | "LOAD_MESSAGES" | "LOAD_MESSAGES_FAILURE" | "LOAD_MESSAGES_SUCCESS" | "LOAD_MESSAGES_SUCCESS_CACHED" | "LOAD_MESSAGE_INTERACTION_DATA_SUCCESS" | "LOCAL_MESSAGES_LOADED" | "LOCAL_MESSAGE_CREATE" | "LOGOUT" | "MESSAGE_CREATE" | "MESSAGE_DELETE" | "MESSAGE_DELETE_BULK" | "MESSAGE_EDIT_FAILED_AUTOMOD" | "MESSAGE_EXPLICIT_CONTENT_SCAN_TIMEOUT" | "MESSAGE_REACTION_ADD" | "MESSAGE_REACTION_ADD_MANY" | "MESSAGE_REACTION_REMOVE" | "MESSAGE_REACTION_REMOVE_ALL" | "MESSAGE_REACTION_REMOVE_EMOJI" | "MESSAGE_REVEAL" | "MESSAGE_SEND_FAILED" | "MESSAGE_SEND_FAILED_AUTOMOD" | "MESSAGE_UPDATE" | "OVERLAY_INITIALIZE" | "RELATIONSHIP_ADD" | "RELATIONSHIP_REMOVE" | "THREAD_CREATE_LOCAL" | "THREAD_DELETE" | "THREAD_MEMBER_LIST_UPDATE" | "TRUNCATE_MESSAGES" | "UPLOAD_FAIL" | "UPLOAD_START">;

export class MessageStore<Action extends FluxAction = MessageStoreAction> extends FluxStore<Action> {
    static displayName: "MessageStore";

    focusedMessageId(e?: any): any; // TEMP
    getLastCommandMessage(e?: any): any; // TEMP
    getLastEditableMessage(e?: any): any; // TEMP
    getLastMessage(e?: any): any; // TEMP
    getLastNonCurrentUserMessage(e?: any): any; // TEMP
    getMessage(e?: any, t?: any): any; // TEMP
    getMessages(guildId?: string | Nullish): any; // TEMP
    hasCurrentUserSentMessage(e?: any): any; // TEMP
    hasCurrentUserSentMessageSinceAppStart(): any; // TEMP
    hasPresent(e?: any): any; // TEMP
    initialize(): void;
    isLoadingMessages(e?: any): any; // TEMP
    isReady(e?: any): any; // TEMP
    jumpedMessageId(e?: any): any; // TEMP
    whenReady(e?: any, t?: any): any; // TEMP
}
