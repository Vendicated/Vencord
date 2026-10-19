/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./MessagePopover.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { ChevronSmallLeftIcon, ChevronSmallRightIcon } from "@components/Icons";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import { IconComponent, IconProps } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { Clickable, useLayoutEffect, useRef } from "@webpack/common";
import type { ComponentType, HTMLProps, ReactElement, ReactNode } from "react";

import { useSettings } from "./Settings";

const logger = new Logger("MessagePopover");

const ToolbarClasses = findCssClassesLazy("wrapper", "button", "selected", "separator", "disabled", "dangerous");
const HoverBarClasses = findCssClassesLazy("popover", "hoverBarButton", "icon", "buttonContent");

export interface MessagePopoverButtonItem extends HTMLProps<HTMLDivElement> {
    key?: string,
    label: string,
    icon: ComponentType<any>,
    ariaLabel?: string,
    buttonClassName?: string
    dangerous?: boolean,
    disabled?: boolean,
    iconProps?: IconProps,
    onTooltipShow?: () => void,
    onTooltipHide?: () => void,
    separator?: boolean,
    tooltipText?: ReactElement,
}

export type MessagePopoverButtonFactory = (message: Message) => MessagePopoverButtonItem | null;
export type MessagePopoverButtonData = {
    render: MessagePopoverButtonFactory;
    /**
     * This icon is used only for Settings UI. Your render function must still return an icon,
     * and it can be different from this one.
     */
    icon: IconComponent;
};

export const MessagePopoverButtonMap = new Map<string, MessagePopoverButtonData>();

/**
 * The icon argument is used only for Settings UI. Your render function must still return an icon,
 * and it can be different from this one.
 */
export function addMessagePopoverButton(
    identifier: string,
    render: MessagePopoverButtonFactory,
    icon: IconComponent
) {
    MessagePopoverButtonMap.set(identifier, { render, icon });
}

export function removeMessagePopoverButton(identifier: string) {
    MessagePopoverButtonMap.delete(identifier);
}

function VencordPopoverButtons(props: { Component: React.ComponentType<MessagePopoverButtonItem>, message: Message; }) {
    const { Component, message } = props;

    const { messagePopoverButtons } = useSettings(["uiElements.messagePopoverButtons.*"]).uiElements;

    const elements = Array.from(MessagePopoverButtonMap.entries())
        .filter(([key]) => messagePopoverButtons[key]?.enabled !== false)
        .map(([key, { render }]) => {
            try {
                // FIXME: this should use proper React to ensure hooks work
                const item = render(message);
                if (!item) return null;

                return (
                    <ErrorBoundary noop>
                        <Component key={key} {...item} />
                    </ErrorBoundary>
                );
            } catch (err) {
                logger.error(`[${key}]`, err);
                return null;
            }
        });

    return <>{elements}</>;
}

function OverflowArrow({ direction, onClick }: { direction: "left" | "right", onClick(): void; }) {
    const Icon = direction === "left" ? ChevronSmallLeftIcon : ChevronSmallRightIcon;

    return (
        <div className={`vc-popover-overflow-arrow vc-popover-overflow-arrow-${direction}`}>
            <Clickable
                className={classes(ToolbarClasses.button, HoverBarClasses.hoverBarButton)}
                onClick={onClick}
                aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
            >
                <Icon className={HoverBarClasses.icon} />
            </Clickable>
        </div>
    );
}

function PopoverOverflow({ children }: { children: ReactNode; }) {
    const scrollerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        scroller.scrollLeft = scroller.scrollWidth;

        const onWheel = (e: WheelEvent) => {
            if (scroller.scrollWidth <= scroller.clientWidth) return;
            e.preventDefault();
            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            scroller.scrollLeft += e.deltaMode === WheelEvent.DOM_DELTA_LINE ? delta * 16 : delta;
        };
        scroller.addEventListener("wheel", onWheel, { passive: false });
        return () => scroller.removeEventListener("wheel", onWheel);
    }, []);

    const scroll = (direction: 1 | -1) => {
        const scroller = scrollerRef.current;
        scroller?.scrollBy({ left: direction * scroller.clientWidth * 0.75, behavior: "smooth" });
    };

    return (
        <div ref={scrollerRef} className="vc-popover-overflow">
            <div className="vc-popover-overflow-track">
                <OverflowArrow direction="left" onClick={() => scroll(-1)} />
                {children}
                <OverflowArrow direction="right" onClick={() => scroll(1)} />
            </div>
        </div>
    );
}

export function _wrapPopoverBar(children: ReactNode[]) {
    return (
        <ErrorBoundary fallback={() => <>{...children}</>}>
            <PopoverOverflow>{...children}</PopoverOverflow>
        </ErrorBoundary>
    );
}

export function _buildPopoverElements(
    Component: React.ComponentType<MessagePopoverButtonItem>,
    message: Message
) {
    return <VencordPopoverButtons Component={Component} message={message} />;
}
