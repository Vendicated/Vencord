/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Stringable } from "../internal";
import type { Store } from "./Store";

export declare class BatchedStoreListener {
    constructor(stores: Store[], changeCallback: () => void);

    attach(debugName?: Stringable): void;
    detach(): void;

    changeCallback: () => void;
    handleStoreChange: () => void;
    stores: Store[];
    storeVersionHandled: number | undefined;
}
