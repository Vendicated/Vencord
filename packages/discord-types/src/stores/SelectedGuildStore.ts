/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { GenericConstructor } from "../internal";
import type { FluxPersistedStore } from "./abstract/FluxPersistedStore";

export interface SelectedGuildStoreState {
    lastSelectedGuildId: string | null;
    selectedGuildId: string | null;
    selectedGuildTimestampMillis: { [guildId: string]: number; };
}

export type SelectedGuildStoreAction = ExtractAction<FluxAction, "CHANNEL_SELECT" | "CONNECTION_OPEN" | "GUILD_DELETE" | "GUILD_MEMBER_REMOVE" | "LOGOUT" | "OVERLAY_INITIALIZE">;

export declare class SelectedGuildStore<
    Constructor extends GenericConstructor = typeof SelectedGuildStore,
    State extends SelectedGuildStoreState = SelectedGuildStoreState,
    Action extends FluxAction = SelectedGuildStoreAction
> extends FluxPersistedStore<Constructor, State, Action> {
    static displayName: "SelectedGuildStore";
    static persistKey: "SelectedGuildStore";

    getGuildId(): string | null;
    getLastSelectedGuildId(): string | null;
    getLastSelectedTimestamp(guildId: string): number | undefined;
    getState(): State;
    initialize(state: SelectedGuildStoreState): void;
}
