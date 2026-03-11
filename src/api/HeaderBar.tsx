/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import { findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { Clickable, Tooltip, useEffect, useState } from "@webpack/common";
import type { ComponentType, JSX, MouseEventHandler, ReactNode } from "react";

const logger = new Logger("HeaderBarAPI");

const HeaderBarClasses = findCssClassesLazy("clickable", "selected", "badge", "badgeContainer");
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '"aria-haspopup":') as ComponentType<ChannelToolbarButtonProps>;

export interface HeaderBarButtonProps {
    /** The icon component to render inside the button */
    icon: ComponentType<any>;
    /** Tooltip text shown on hover. Pass null to disable tooltip */
    tooltip: ReactNode;
    /** Called when the button is clicked */
    onClick?: MouseEventHandler<HTMLDivElement>;
    /** Called when the button is right-clicked */
    onContextMenu?: MouseEventHandler<HTMLDivElement>;
    /** Additional CSS class names */
    className?: string;
    /** Size of the icon in pixels */
    iconSize?: number;
    /** Tooltip position relative to the button */
    position?: "top" | "bottom" | "left" | "right";
    /** Whether the button appears in a selected/active state */
    selected?: boolean;
    /** Aria label for accessibility */
    "aria-label"?: string;
}

export interface ChannelToolbarButtonProps extends HeaderBarButtonProps {
    /** CSS class name for the icon element */
    iconClassName?: string;
    /** Tooltip position relative to the button */
    position?: "top" | "bottom" | "left" | "right";
    /** Whether the button appears in a selected/active state */
    selected?: boolean;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Whether to show a notification badge */
    showBadge?: boolean;
    /** Position of the notification badge */
    badgePosition?: "top" | "bottom";
}

export type HeaderBarButtonFactory = () => JSX.Element | null;

export interface HeaderBarButtonData {
    /** Function that renders the button component */
    render: HeaderBarButtonFactory;
    /** Icon component used for settings UI display */
    icon: ComponentType<any>;
    /** Higher priority buttons appear further right. Default: 0 */
    priority?: number;
    /** Where to render the button. Default: "headerbar" */
    location?: "headerbar" | "channeltoolbar";
}

interface ButtonEntry {
    render: HeaderBarButtonFactory;
    priority: number;
}

/**
 * Button component for the top header bar (title bar area).
 *
 * @example
 * <HeaderBarButton
 *     icon={MyIcon}
 *     tooltip="My Button"
 *     onClick={() => console.log("clicked")}
 * />
 */
export function HeaderBarButton(props: HeaderBarButtonProps & { ref?: React.RefObject<any>; }) {
    const {
        icon: Icon,
        tooltip,
        onClick,
        onContextMenu,
        className,
        iconSize = 18,
        position = "bottom",
        selected,
        ref,
        "aria-label": ariaLabel,
    } = props;

    const label = ariaLabel ?? (typeof tooltip === "string" ? tooltip : undefined);

    return (
        <Tooltip text={tooltip ?? ""} position={position} shouldShow={tooltip != null}>
            {({ onMouseEnter, onMouseLeave }) => (
                <Clickable
                    {...{ innerRef: ref } as any}
                    className={classes(HeaderBarClasses.clickable, className)}
                    style={{ width: iconSize, boxSizing: "content-box", justifyContent: "center" }}
                    onClick={onClick}
                    onContextMenu={onContextMenu}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-expanded={selected}
                >
                    <Icon size="custom" width={iconSize} height={iconSize} color="currentColor" />
                </Clickable>
            )}
        </Tooltip>
    );
}

/**
 * Button component for the channel toolbar (below the search bar).
 * Automatically handles selected state styling.
 *
 * @example
 * <ChannelToolbarButton
 *     icon={MyIcon}
 *     tooltip={isOpen ? null : "My Button"}
 *     onClick={() => setOpen(v => !v)}
 *     selected={isOpen}
 * />
 */
export function ChannelToolbarButton(props: ChannelToolbarButtonProps) {
    return <HeaderBarIcon {...props} />;
}

const headerBarButtons = new Map<string, ButtonEntry>();
const channelToolbarButtons = new Map<string, ButtonEntry>();

const headerBarListeners = new Set<() => void>();
const channelToolbarListeners = new Set<() => void>();

/**
 * Adds a button to the header bar (title bar area).
 *
 * @param id - Unique identifier for the button (e.g., "my-plugin-button")
 * @param render - Function that returns the button JSX
 * @param priority - Higher values appear further right. Default: 0
 *
 * @example
 * addHeaderBarButton("my-button", () => (
 *     <HeaderBarButton
 *         icon={MyIcon}
 *         tooltip="My Button"
 *         onClick={handleClick}
 *     />
 * ));
 */
export function addHeaderBarButton(id: string, render: HeaderBarButtonFactory, priority = 0) {
    headerBarButtons.set(id, { render, priority });
    headerBarListeners.forEach(listener => listener());
}

/**
 * Removes a button from the header bar.
 *
 * @param id - The identifier used when adding the button
 */
export function removeHeaderBarButton(id: string) {
    headerBarButtons.delete(id);
    headerBarListeners.forEach(listener => listener());
}

/**
 * Adds a button to the channel toolbar (below the search bar, next to pins/members).
 *
 * @param id - Unique identifier for the button (e.g., "my-plugin-toolbar")
 * @param render - Function that returns the button JSX
 * @param priority - Higher values appear further right. Default: 0
 *
 * @example
 * addChannelToolbarButton("my-toolbar", () => (
 *     <ChannelToolbarButton
 *         icon={MyIcon}
 *         tooltip="My Button"
 *         onClick={handleClick}
 *     />
 * ));
 */
export function addChannelToolbarButton(id: string, render: HeaderBarButtonFactory, priority = 0) {
    channelToolbarButtons.set(id, { render, priority });
    channelToolbarListeners.forEach(listener => listener());
}

/**
 * Removes a button from the channel toolbar.
 *
 * @param id - The identifier used when adding the button
 */
export function removeChannelToolbarButton(id: string) {
    channelToolbarButtons.delete(id);
    channelToolbarListeners.forEach(listener => listener());
}

function HeaderBarButtons() {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        headerBarListeners.add(listener);
        return () => { headerBarListeners.delete(listener); };
    }, []);

    return Array.from(headerBarButtons)
        .sort(([, a], [, b]) => a.priority - b.priority)
        .map(([id, { render: Button }]) => (
            <ErrorBoundary noop key={id} onError={e => logger.error(`Failed to render header bar button: ${id}`, e.error)}>
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

    return Array.from(channelToolbarButtons)
        .sort(([, a], [, b]) => a.priority - b.priority)
        .map(([id, { render: Button }]) => (
            <ErrorBoundary noop key={id} onError={e => logger.error(`Failed to render channel toolbar button: ${id}`, e.error)}>
                <Button />
            </ErrorBoundary>
        ));
}

/** @internal Injected by HeaderBarAPI patch (do NOT call directly) */
export function _addHeaderBarButtons() {
    return [<HeaderBarButtons key="vc-header-bar-buttons" />];
}

/** @internal Injected by HeaderBarAPI patch (do NOT call directly) */
export function _addChannelToolbarButtons(toolbar: ReactNode[]) {
    toolbar.push(<ChannelToolbarButtons key="vc-channel-toolbar-buttons" />);
}
