/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PersistedStore } from "../flux/PersistedStore";
import type { Draft, DraftForumThreadSettings, DraftNonForumThreadSettings, DraftType } from "../general/Draft";
import type { GenericConstructor, Nullish } from "../internal";

export interface DraftStoreState {
    [userId: string]: { [channelId: string]: { [Type in DraftType]?: Draft<Type>; }; };
}

export declare class DraftStore<
    Constructor extends GenericConstructor = typeof DraftStore,
    State extends DraftStoreState = DraftStoreState
> extends PersistedStore<Constructor, State> {
    static displayName: "DraftStore";
    static persistKey: "DraftStore";

    getDraft(channelId: string, draftType: DraftType): string;
    getRecentlyEditedDrafts<Type extends DraftType>(draftType: Type): {
        channelId: string;
        draft: "draft" extends keyof Draft<Type> ? Draft<Type>["draft"] : undefined;
        timestamp: number;
    }[];
    getState(): State;
    getThreadDraftWithParentMessageId(messageId: string): DraftNonForumThreadSettings | Nullish;
    getThreadSettings<ForumThread extends boolean = boolean>(threadId: string):
        (ForumThread extends true ? DraftForumThreadSettings : DraftNonForumThreadSettings) | Nullish;
    initialize(state?: State | Nullish): void;
}
