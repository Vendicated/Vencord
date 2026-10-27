/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./ServerListItem.css";

import { classes } from "@utils/misc";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { useMemo, useState } from "@webpack/common";
import type { ComponentType, CSSProperties, MouseEventHandler, ReactNode } from "react";

import ErrorBoundary from "./ErrorBoundary";

const GuildlessServerListItem = findComponentByCodeLazy("tooltip:", "lowerBadgeSize:");
const ServerListItemPill = findComponentByCodeLazy("=!1,hovered:", "=!1,unread:", "=!1,disabled:");
const NumberBadge = findComponentByCodeLazy("BADGE_NOTIFICATION_BACKGROUND", "let{count:");
const getBadgeWidth = findByCodeLazy("?16:", "?22:30") as (count: number) => number;

export interface ServerListItemIconProps {
    className: string;
    color: string;
}

export type ServerListItemBadgeProps = {
    color?: string;
    textColor?: string;
} & ({
    count: number;
    text?: never;
    width?: never;
} | {
    count?: never;
    text: string;
    width: number;
});

export interface ServerListItemProps {
    id: string;
    icon?: ComponentType<ServerListItemIconProps>;
    imageUrl?: string;
    tooltip?: ReactNode;
    "aria-label"?: string;
    className?: string;
    style?: CSSProperties;
    selected?: boolean;
    unread?: boolean;
    showPill?: boolean;
    nudgeOnClick?: boolean;
    badge?: ServerListItemBadgeProps;
    onClick?: MouseEventHandler<HTMLElement>;
    onMouseDown?: MouseEventHandler<HTMLElement>;
    onContextMenu?: MouseEventHandler<HTMLElement>;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

export const ServerListItem = ErrorBoundary.wrap(function ServerListItem({ id, icon, imageUrl, tooltip, "aria-label": ariaLabel, className, style, selected = false, unread = false, showPill = true, nudgeOnClick = true, badge, onClick, onMouseDown, onContextMenu, onMouseEnter, onMouseLeave }: ServerListItemProps) {
    const [hovered, setHovered] = useState(false);

    const imageIcon = useMemo(() => imageUrl ? function ServerListItemImage() {
        return <img src={imageUrl} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
    } : undefined, [imageUrl]);

    let lowerBadgeSize: { width: number; } | undefined;
    let lowerBadge: ReactNode = null;

    if (badge && (badge.text !== undefined ? badge.text.length > 0 : badge.count > 0)) {
        const width = badge.text !== undefined ? badge.width : getBadgeWidth(badge.count);
        lowerBadgeSize = { width };

        lowerBadge = (
            <NumberBadge
                count={badge.count ?? 0}
                color={badge.color}
                style={{ width, color: badge.textColor }}
                renderBadgeCount={badge.text !== undefined ? () => badge.text : undefined}
            />
        );
    }

    return (
        <div id={id} data-nudge-on-click={nudgeOnClick} className={classes("vc-server-list-item", className)} style={{ position: "relative", ...style }}>
            {showPill && (
                <div style={{ pointerEvents: "none" }}>
                    <ServerListItemPill overlay unread={unread} selected={selected} hovered={hovered} />
                </div>
            )}
            <div style={{ position: "relative" }}>
                <GuildlessServerListItem
                    id={id}
                    icon={imageIcon ?? icon}
                    tooltip={tooltip}
                    aria-label={ariaLabel}
                    showPill={false}
                    selected={selected}
                    onClick={onClick}
                    onMouseDown={onMouseDown}
                    onContextMenu={onContextMenu}
                    onMouseEnter={() => {
                        setHovered(true);
                        onMouseEnter?.();
                    }}
                    onMouseLeave={() => {
                        setHovered(false);
                        onMouseLeave?.();
                    }}
                    {...(lowerBadge ? { lowerBadge, lowerBadgeSize } : {})}
                />
            </div>
        </div>
    );
}, { noop: true });
