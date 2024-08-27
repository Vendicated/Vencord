/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export declare class ChangeListeners {
    has(listener: ChangeListener): boolean;
    hasAny(): boolean;
    invokeAll(): void;

    add: (listener: ChangeListener<false>) => void;
    /**
     * @param listener The change listener to add. It will be removed when it returns false.
     */
    addConditional: (
        listener: ChangeListener<true>,
        immediatelyCall?: boolean | undefined /* = true */
    ) => void;
    listeners: Set<ChangeListener>;
    remove: (listener: ChangeListener) => void;
}

export type ChangeListener<Conditional extends boolean = boolean>
    = true extends Conditional
        ? () => unknown
        : () => void;
