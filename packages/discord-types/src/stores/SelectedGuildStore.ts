/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PersistedStore } from "../flux/PersistedStore";
import type { GenericConstructor, Nullish } from "../internal";

export interface SelectedGuildStoreState {
    lastSelectedGuildId: string | null;
    selectedGuildId: string | null;
    selectedGuildTimestampMillis: { [guildId: string]: number; };
}

export declare class SelectedGuildStore<
    Constructor extends GenericConstructor = typeof SelectedGuildStore,
    State extends SelectedGuildStoreState = SelectedGuildStoreState
> extends PersistedStore<Constructor, State> {
    static displayName: "SelectedGuildStore";
    static persistKey: "SelectedGuildStore";

    getGuildId(): string | null;
    getLastSelectedGuildId(): string | null;
    getLastSelectedTimestamp(guildId: string): number | undefined;
    getState(): State;
    initialize(state?: State | Nullish): void;
}
