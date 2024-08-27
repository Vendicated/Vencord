/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { GenericConstructor } from "../internal";
import type { ActionHandlerMap } from "./ActionHandlersGraph";
import type { Store } from "./Store";

export interface SnapshotStoreSnapshot<SnapshotData = unknown> {
    data: SnapshotData;
    version: number;
}

export declare abstract class SnapshotStore<
    Constructor extends GenericConstructor = GenericConstructor,
    SnapshotData = unknown
> extends Store {
    constructor(
        actionHandlers: Partial<ActionHandlerMap>
            & Partial<Record<"CLEAR_CACHES" | "WRITE_CACHES", never>>
    );

    static allStores: SnapshotStore[];
    static clearAll(): void;
    /**
     * Not present on {@link SnapshotStore}'s constructor.
     * All subclasses are required to define their own.
     */
    static displayName: string;

    clear(): void;
    getClass(): Constructor;
    get persistKey(): string;
    readSnapshot(version: number): SnapshotData | null;
    save(): void;
    abstract takeSnapshot(): SnapshotStoreSnapshot<SnapshotData>;
}
