/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { useEffect, useState } from "@webpack/common";
import type { JSX } from "react";

export type HeaderBarButtonFactory = () => JSX.Element | null;

interface HeaderBarButton {
    render: HeaderBarButtonFactory;
    priority: number;
}

export const buttons = new Map<string, HeaderBarButton>();

const listeners = new Set<() => void>();

/**
 * Add a button to the header bar.
 * @param id Unique identifier for the button.
 * @param render Function that renders the button component.
 * @param priority Higher priority = more to the right. Default is 0.
 */
export function addHeaderBarButton(id: string, render: HeaderBarButtonFactory, priority = 0) {
    buttons.set(id, { render, priority });
    listeners.forEach(l => l());
}

/**
 * Remove a button from the header bar.
 * @param id The identifier of the button to remove.
 */
export function removeHeaderBarButton(id: string) {
    buttons.delete(id);
    listeners.forEach(l => l());
}

function HeaderBarButtons() {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    }, []);

    const sorted = Array.from(buttons).sort(([, a], [, b]) => a.priority - b.priority);

    return sorted.map(([id, { render: Button }]) => (
        <ErrorBoundary noop key={id}>
            <Button />
        </ErrorBoundary>
    ));
}

export function _addButtons() {
    return [<HeaderBarButtons key="vc-header-bar-buttons" />];
}
