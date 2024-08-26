/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Stringable } from "../internal";
import type { FluxStore } from "../stores/abstract/FluxStore";

// Original name: BatchedStoreListener
export declare class FluxBatchedStoreListener {
    constructor(stores: FluxStore[], changeCallback: () => void);

    attach(debugName?: Stringable): void;
    detach(): void;

    changeCallback: () => void;
    handleStoreChange: () => void;
    stores: FluxStore[];
    storeVersionHandled: number | undefined;
}
