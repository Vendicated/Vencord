/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxActionHandlerMap } from "../../flux/FluxActionHandlersGraph";
import type { GenericConstructor } from "../../internal";
import type { FluxStore } from "./FluxStore";

export interface FluxSnapshot<SnapshotData = unknown> {
    data: SnapshotData;
    version: number;
}

// Original name: SnapshotStore
export declare abstract class FluxSnapshotStore<
    Constructor extends GenericConstructor = GenericConstructor,
    SnapshotData = unknown
> extends FluxStore {
    constructor(
        actionHandlers: Partial<FluxActionHandlerMap>
            & Partial<Record<"CLEAR_CACHES" | "WRITE_CACHES", never>>
    );

    static allStores: FluxSnapshotStore[];
    static clearAll(): void;
    /**
     * Not present on {@link FluxSnapshotStore}'s constructor.
     * All subclasses are required to define their own.
     */
    static displayName: string;

    clear(): void;
    getClass(): Constructor;
    get persistKey(): string;
    readSnapshot(version: number): SnapshotData | null;
    save(): void;
    abstract takeSnapshot(): FluxSnapshot<SnapshotData>;
}
