/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxActionHandlerMap } from "../../flux/fluxActionHandlers";
import type { ExcludeAction, ExtractAction, FluxAction } from "../../flux/fluxActions";
import type { GenericConstructor } from "../../internal";
import type { FluxStore } from "./FluxStore";

export interface FluxSnapshot<SnapshotData = any> {
    data: SnapshotData;
    version: number;
}

type CacheActionType = "CLEAR_CACHES" | "WRITE_CACHES";

export type FluxSnapshotStoreAction = ExcludeAction<FluxAction, CacheActionType>;

// Original name: SnapshotStore
export abstract class FluxSnapshotStore<
    Constructor extends GenericConstructor = GenericConstructor,
    SnapshotData = unknown,
    Action extends FluxSnapshotStoreAction = FluxSnapshotStoreAction
> extends FluxStore<Action & ExtractAction<FluxAction, CacheActionType>> {
    constructor(actionHandlers: FluxActionHandlerMap<Action>);

    static allStores: FluxSnapshotStore[];
    static clearAll(): void;
    /** Not present on FluxSnapshotStore's constructor. */
    static displayName: string;

    clear(): void;
    getClass(): Constructor;
    get persistKey(): string;
    readSnapshot(version: number): SnapshotData | null;
    save(): void;
    abstract takeSnapshot(): FluxSnapshot<SnapshotData>;
}
