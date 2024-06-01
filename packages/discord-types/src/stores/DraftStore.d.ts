/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { Draft, DraftForumThreadSettings, DraftNonForumThreadSettings, DraftType } from "../general/Draft";
import type { GenericConstructor, Nullish } from "../internal";
import type { FluxPersistedStore } from "./abstract/FluxPersistedStore";

export interface DraftStoreState {
    [userId: string]: { [channelId: string]: { [Type in DraftType]?: Draft<Type>; }; };
}

export type DraftStoreAction = ExtractAction<FluxAction, "CHANNEL_DELETE" | "CONNECTION_OPEN" | "DRAFT_CHANGE" | "DRAFT_CLEAR" | "DRAFT_SAVE" | "GUILD_DELETE" | "LOGOUT" | "MULTI_ACCOUNT_REMOVE_ACCOUNT" | "THREAD_CREATE" | "THREAD_DELETE" | "THREAD_SETTINGS_DRAFT_CHANGE">;

export class DraftStore<
    Constructor extends GenericConstructor = typeof DraftStore,
    State extends DraftStoreState = DraftStoreState,
    Action extends FluxAction = DraftStoreAction
> extends FluxPersistedStore<Constructor, State, Action> {
    static displayName: "DraftStore";
    static persistKey: "DraftStore";

    getDraft(channelId: string, draftType: DraftType): string;
    getRecentlyEditedDrafts<Type extends DraftType>(draftType: Type): {
        channelId: string;
        draft: "draft" extends keyof Draft<Type> ? string : undefined;
        timestamp: number;
    };
    getState(): State;
    getThreadDraftWithParentMessageId(messageId: string): DraftNonForumThreadSettings | Nullish;
    getThreadSettings<ForumThread extends boolean = boolean>(threadId: string):
        (ForumThread extends true ? DraftForumThreadSettings : DraftNonForumThreadSettings) | Nullish;
    initialize(state: State): void;
}
