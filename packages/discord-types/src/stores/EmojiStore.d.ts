/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { GenericConstructor } from "../internal";
import type { FluxPersistedStore } from "./abstract/FluxPersistedStore";

export interface EmojiStoreState {
    [key: string]: any; // TEMP
}

export type EmojiStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC" | "CACHED_EMOJIS_LOADED" | "CONNECTION_OPEN" | "EMOJI_AUTOSUGGESTION_UPDATE" | "EMOJI_TRACK_USAGE" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_EMOJIS_UPDATE" | "GUILD_MEMBER_UPDATE" | "GUILD_ROLE_CREATE" | "GUILD_ROLE_UPDATE" | "GUILD_UPDATE" | "MESSAGE_REACTION_ADD" | "TOP_EMOJIS_FETCH_SUCCESS" | "USER_SETTINGS_PROTO_UPDATE">;

export class EmojiStore<
    Constructor extends GenericConstructor = typeof EmojiStore,
    State extends EmojiStoreState = EmojiStoreState,
    Action extends FluxAction = EmojiStoreAction
> extends FluxPersistedStore<Constructor, State, Action> {
    static displayName: "EmojiStore";
    static persistKey: "EmojiStoreV2";

    get categories(): any; // TEMP
    get diversitySurrogate(): any; // TEMP
    get emojiFrecencyWithoutFetchingLatest(): any; // TEMP
    getCustomEmojiById(e?: any): any; // TEMP
    getDisambiguatedEmojiContext(e?: any): any; // TEMP
    getEmojiAutosuggestion(e?: any): any; // TEMP
    getGuildEmoji(e?: any): any; // TEMP
    getGuilds(): any; // TEMP
    getNewlyAddedEmoji(e?: any): any; // TEMP
    getSearchResultsOrder(e?: any, t?: any, n?: any): any; // TEMP
    getState(): State;
    getTopEmoji(e?: any): any; // TEMP
    getTopEmojisMetadata(e?: any): any; // TEMP
    getUsableCustomEmojiById(e?: any): any; // TEMP
    getUsableGuildEmoji(e?: any): any; // TEMP
    hasFavoriteEmojis(e?: any): any; // TEMP
    hasPendingUsage(): any; // TEMP
    hasUsableEmojiInAnyGuild(): any; // TEMP
    initialize(state: State): void;
    get loadState(): any; // TEMP
    searchWithoutFetchingLatest(e?: any): any; // TEMP
}
