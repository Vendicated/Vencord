/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { findComponentByCodeLazy } from "@webpack";
import { useEffect, useState } from "@webpack/common";
import type { ComponentType, JSX, MouseEventHandler, ReactNode, RefObject } from "react";

const logger = new Logger("HeaderBarAPI");

export type HeaderBarButtonFactory = () => JSX.Element | null;

export type HeaderBarButtonLocation = "headerbar" | "channeltoolbar";

export interface HeaderBarButtonData {
    render: HeaderBarButtonFactory;
    icon: ComponentType<any>;
    priority?: number;
    location?: HeaderBarButtonLocation;
}

interface HeaderBarButton {
    render: HeaderBarButtonFactory;
    priority: number;
}

export const buttons = new Map<string, HeaderBarButton>();
export const channelToolbarButtons = new Map<string, HeaderBarButton>();

const listeners = new Set<() => void>();
const channelToolbarListeners = new Set<() => void>();

export interface HeaderBarButtonProps {
    icon: ComponentType<any>;
    tooltip: ReactNode;
    onClick?: MouseEventHandler<HTMLDivElement>;
    onContextMenu?: MouseEventHandler<HTMLDivElement>;
    className?: string;
    iconClassName?: string;
    position?: "top" | "bottom" | "left" | "right";
    selected?: boolean;
    disabled?: boolean;
    showBadge?: boolean;
    badgePosition?: "top" | "bottom";
    iconSize?: number;
    ref?: RefObject<any>;
}

export const HeaderBarButton = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"') as ComponentType<HeaderBarButtonProps>;

export const ChannelToolbarButton = HeaderBarButton;

/**
 * @param id Unique identifier for the button.
 * @param render Function that renders the button component.
 * @param priority Higher priority = more to the right. Default is 0.
 */
export function addHeaderBarButton(id: string, render: HeaderBarButtonFactory, priority = 0) {
    buttons.set(id, { render, priority });
    listeners.forEach(l => l());
}

export function removeHeaderBarButton(id: string) {
    buttons.delete(id);
    listeners.forEach(l => l());
}

/**
 * @param id Unique identifier for the button.
 * @param render Function that renders the button component.
 * @param priority Higher priority = more to the right. Default is 0.
 */
export function addChannelToolbarButton(id: string, render: HeaderBarButtonFactory, priority = 0) {
    channelToolbarButtons.set(id, { render, priority });
    channelToolbarListeners.forEach(l => l());
}

export function removeChannelToolbarButton(id: string) {
    channelToolbarButtons.delete(id);
    channelToolbarListeners.forEach(l => l());
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
        <ErrorBoundary noop key={id} onError={e => logger.error(`Failed to render ${id}`, e.error)}>
            <Button />
        </ErrorBoundary>
    ));
}

function ChannelToolbarButtons() {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        channelToolbarListeners.add(listener);
        return () => { channelToolbarListeners.delete(listener); };
    }, []);

    const sorted = Array.from(channelToolbarButtons).sort(([, a], [, b]) => a.priority - b.priority);

    return sorted.map(([id, { render: Button }]) => (
        <ErrorBoundary noop key={id} onError={e => logger.error(`Failed to render channel toolbar ${id}`, e.error)}>
            <Button />
        </ErrorBoundary>
    ));
}

export function _addButtons() {
    return [<HeaderBarButtons key="vc-header-bar-buttons" />];
}

export function _addChannelToolbarButtons(toolbar: ReactNode[]) {
    toolbar.push(<ChannelToolbarButtons key="vc-channel-toolbar-buttons" />);
}
