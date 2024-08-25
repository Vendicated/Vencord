/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Original name: ChangeListeners
export declare class FluxChangeListeners {
    has(listener: FluxChangeListener): boolean;
    hasAny(): boolean;
    invokeAll(): void;

    add: (listener: FluxChangeListener<false>) => void;
    /**
     * @param listener The change listener to add. It will be removed when it returns false.
     */
    addConditional: (
        listener: FluxChangeListener<true>,
        immediatelyCall?: boolean | undefined /* = true */
    ) => void;
    listeners: Set<FluxChangeListener>;
    remove: (listener: FluxChangeListener) => void;
}

export type FluxChangeListener<Conditional extends boolean = boolean>
    = true extends Conditional
        ? () => unknown
        : () => void;
