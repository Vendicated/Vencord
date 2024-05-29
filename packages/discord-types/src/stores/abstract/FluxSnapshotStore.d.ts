/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxActionHandlerMap } from "../../flux/fluxActionHandlers";
import type { ExcludeAction, FluxAction } from "../../flux/fluxActions";
import type { GenericConstructor } from "../../internal";
import type { FluxStore } from "./FluxStore";

export interface FluxSnapshot<SnapshotData = any> {
    data: SnapshotData;
    version: number;
}

export type FluxSnapshotStoreAction = ExcludeAction<FluxAction, "CLEAR_CACHES" | "WRITE_CACHES">;

export abstract class FluxSnapshotStore<
    Constructor extends GenericConstructor = GenericConstructor,
    SnapshotData = any,
    Action extends FluxSnapshotStoreAction = FluxSnapshotStoreAction
> extends FluxStore<Action & Exclude<FluxAction, FluxSnapshotStoreAction>> {
    constructor(actionHandlers: FluxActionHandlerMap<Action>);

    static allStores: FluxSnapshotStore[];
    static clearAll(): void;
    static displayName: string; // not actually defined on SnapshotStore's constructor, but all subclasses are required to have it

    clear(): void;
    getClass(): Constructor;
    get persistKey(): string;
    readSnapshot(version: number): SnapshotData | null;
    save(): void;
    abstract takeSnapshot(): FluxSnapshot<SnapshotData>;
}
