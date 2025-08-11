/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ErrorBoundary } from "@components/index";
import { findComponentByCodeLazy } from "@webpack";
import { SearchableSelect, useState } from "@webpack/common";
import { JSX } from "react";

import { formatLowerBadge } from "./misc";

// GuildlessServerListItem's built-in pill does not support unread state.
export const GuildlessServerListItemComponent = findComponentByCodeLazy("tooltip:", "lowerBadgeSize:");
export const GuildedServerListItemPillComponent = findComponentByCodeLazy('"pill":"empty"');
export const ServerListItemLowerBadgeComponent = findComponentByCodeLazy("STATUS_DANGER,disableColor:");
export const ServerListItemUpperBadgeComponent = findComponentByCodeLazy("STATUS_DANGER,shape:", "iconBadge,");
export const RadioGroup = findComponentByCodeLazy("radioItemIconClassName,");
export const QuestTile = findComponentByCodeLazy(".rowIndex,trackGuildAndChannelMetadata");

export enum QuestStatus {
    Claimed = "CLAIMED",
    Unclaimed = "UNCLAIMED",
    Ignored = "IGNORED",
    Expired = "EXPIRED",
    Unknown = "UNKNOWN"
}

export interface FetchingQuestsSettingProps {
    interval: number | null;
    alert: string | null;
}

export interface RadioOption {
    name: string;
    value: string;
}

export interface SelectOption {
    label: string;
    value: string | number;
}

export interface DynamicDropdownSettingOption {
    label: string;
    value: string;
    selected: boolean;
    type?: string;
}

export interface RGB {
    r: number;
    g: number;
    b: number;
}

export type ExcludedQuestMap = Map<string, ExcludedQuest>;

export type QuestMap = Map<string, Quest>;

export interface ExcludedQuest {
    id: string;
}

export interface Quest {
    questifyNumber: number;
    id: string;
    config: {
        application: {
            id: string;
            name: string;
        },
        startsAt: string;
        expiresAt: string;
        messages: {
            questName: string;
        };
        taskConfigV2: {
            tasks: {
                WATCH_VIDEO?: {
                    type: "WATCH_VIDEO";
                    target: number;
                },
                WATCH_VIDEO_ON_MOBILE?: {
                    type: "WATCH_VIDEO_ON_MOBILE";
                    target: number;
                },
                PLAY_ON_DESKTOP?: {
                    type: "PLAY_ON_DESKTOP";
                    target: number;
                },
                PLAY_ON_XBOX?: {
                    type: "PLAY_ON_XBOX";
                    target: number;
                },
                PLAY_ON_PLAYSTATION?: {
                    type: "PLAY_ON_PLAYSTATION";
                    target: number;
                },
                PLAY_ACTIVITY?: {
                    type: "PLAY_ACTIVITY";
                    target: number;
                };
            };
        };
    },
    userStatus: null | {
        userId: string;
        claimedAt: string | null;
        completedAt: string | null;
        enrolledAt: string | null;
        progress: null | {
            WATCH_VIDEO?: {
                eventName: "WATCH_VIDEO";
                value: number;
            },
            WATCH_VIDEO_ON_MOBILE?: {
                eventName: "WATCH_VIDEO_ON_MOBILE";
                value: number;
            },
            PLAY_ON_DESKTOP?: {
                eventName: "PLAY_ON_DESKTOP";
                value: number;
            },
            PLAY_ON_XBOX?: {
                eventName: "PLAY_ON_XBOX";
                value: number;
            },
            PLAY_ON_PLAYSTATION?: {
                eventName: "PLAY_ON_PLAYSTATION";
                value: number;
            },
            PLAY_ACTIVITY?: {
                eventName: "PLAY_ACTIVITY";
                value: number;
            },
        };
    },
    dummyColor?: number | null;
}

export function SoundIcon(height: number, width: number, className?: string): JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            height={height}
            width={width}
            fill="none"
            className={className}
        >
            <path fill="currentColor" d="M12 3a1 1 0 0 0-1-1h-.06a1 1 0 0 0-.74.32L5.92 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.92l4.28 4.68a1 1 0 0 0 .74.32H11a1 1 0 0 0 1-1V3ZM15.1 20.75c-.58.14-1.1-.33-1.1-.92v-.03c0-.5.37-.92.85-1.05a7 7 0 0 0 0-13.5A1.11 1.11 0 0 1 14 4.2v-.03c0-.6.52-1.06 1.1-.92a9 9 0 0 1 0 17.5Z" className=""></path><path fill="currentColor" d="M15.16 16.51c-.57.28-1.16-.2-1.16-.83v-.14c0-.43.28-.8.63-1.02a3 3 0 0 0 0-5.04c-.35-.23-.63-.6-.63-1.02v-.14c0-.63.59-1.1 1.16-.83a5 5 0 0 1 0 9.02Z"></path>
        </svg>
    );
}
export function QuestIcon(height: number, width: number, className?: string): JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            height={height}
            width={width}
            fill="none"
            className={className}
        >
            <path fill="currentColor" d="M7.5 21.7a8.95 8.95 0 0 1 9 0 1 1 0 0 0 1-1.73c-.6-.35-1.24-.64-1.9-.87.54-.3 1.05-.65 1.52-1.07a3.98 3.98 0 0 0 5.49-1.8.77.77 0 0 0-.24-.95 3.98 3.98 0 0 0-2.02-.76A4 4 0 0 0 23 10.47a.76.76 0 0 0-.71-.71 4.06 4.06 0 0 0-1.6.22 3.99 3.99 0 0 0 .54-5.35.77.77 0 0 0-.95-.24c-.75.36-1.37.95-1.77 1.67V6a4 4 0 0 0-4.9-3.9.77.77 0 0 0-.6.72 4 4 0 0 0 3.7 4.17c.89 1.3 1.3 2.95 1.3 4.51 0 3.66-2.75 6.5-6 6.5s-6-2.84-6-6.5c0-1.56.41-3.21 1.3-4.51A4 4 0 0 0 11 2.82a.77.77 0 0 0-.6-.72 4.01 4.01 0 0 0-4.9 3.96A4.02 4.02 0 0 0 3.73 4.4a.77.77 0 0 0-.95.24 3.98 3.98 0 0 0 .55 5.35 4 4 0 0 0-1.6-.22.76.76 0 0 0-.72.71l-.01.28a4 4 0 0 0 2.65 3.77c-.75.06-1.45.33-2.02.76-.3.22-.4.62-.24.95a4 4 0 0 0 5.49 1.8c.47.42.98.78 1.53 1.07-.67.23-1.3.52-1.91.87a1 1 0 1 0 1 1.73Z" ></path>
        </svg>
    );
}

export interface ServerListItemUpperBadgeProps {
    icon?: (() => JSX.Element),
    color?: string;
    className?: string;
}

export function ServerListItemUpperBadge(props: ServerListItemUpperBadgeProps): JSX.Element {
    return (
        <ServerListItemUpperBadgeComponent {...props} />
    );
}

export interface ServerListItemLowerBadgeProps {
    count: number;
    className?: string;
    color?: string;
    style?: React.CSSProperties;
    maxDigits?: number;
}

export function ServerListItemLowerBadge(props: ServerListItemLowerBadgeProps): JSX.Element {
    return (
        <ServerListItemLowerBadgeComponent
            {...props}
        />
    );
}

export interface GuildlessServerListItemProps {
    id?: string;
    className?: string;
    icon?: JSX.Element;
    tooltip?: string;
    showPill?: boolean;
    isVisible?: boolean;
    isSelected?: boolean;
    hasUnread?: boolean;
    lowerBadgeProps?: ServerListItemLowerBadgeProps;
    upperBadgeProps?: ServerListItemUpperBadgeProps;
    onClick?: ((e: React.MouseEvent) => void);
    onContextMenu?: ((e: React.MouseEvent) => void);
    onMouseDown?: ((e: React.MouseEvent) => void);
}

export function GuildlessServerListItem({
    id,
    className = "vc-server-list-item",
    icon,
    tooltip,
    showPill = true,
    isVisible,
    isSelected,
    hasUnread,
    lowerBadgeProps,
    upperBadgeProps,
    onClick,
    onContextMenu,
    onMouseDown
}: GuildlessServerListItemProps): JSX.Element {
    const baseClasses = className.split(" ") || ["vc-server-list-item"];
    const mainContainerClass = `${baseClasses.join(" ")}-container`;
    const iconContainerClass = `${baseClasses.join(" ")}-icon-container`;
    const buttonContainerClass = `${baseClasses.join(" ")}-server-list-button-container`;
    const pillContainerClass = `${baseClasses.join(" ")}-pill-container`;
    const buttonClass = `${baseClasses.join(" ")}-button`;
    const pillClass = `${baseClasses.join(" ")}-pill`;
    const pillClassSelected = `${pillClass} selected`;
    const pillClassHovered = `${pillClass} hovered`;
    const lowerBadgeClass = `${baseClasses.join(" ")}-lower-badge`;
    const upperBadgeClass = `${baseClasses.join(" ")}-upper-badge`;

    const [hovered, setHovered] = useState(false);
    const visible = isVisible ?? true;
    const selected = isSelected ?? false;
    const unread = hasUnread ?? false;
    const lowerBadgeData = lowerBadgeProps ? { ...lowerBadgeProps, className: lowerBadgeProps.className ?? lowerBadgeClass } : null;
    const lowerBadgeSize = lowerBadgeData ? { width: formatLowerBadge(lowerBadgeData.count, lowerBadgeData.maxDigits)[1] } : null;

    const lowerBadge = !lowerBadgeData || lowerBadgeData.count === 0 ? null : ServerListItemLowerBadge({ ...lowerBadgeData, style: { ...(lowerBadgeData.style || {}), ...(lowerBadgeSize || {}) } });
    const upperBadgeData = upperBadgeProps ? { ...upperBadgeProps, className: upperBadgeProps.className ?? upperBadgeClass } : null;
    const upperBadge = upperBadgeData ? ServerListItemUpperBadge(upperBadgeData) : null;

    const wrappedIcon = icon ? (
        <div className={iconContainerClass}>
            {icon}
        </div>
    ) : undefined;

    const componentProps: Record<string, any> = {
        ...(wrappedIcon && { icon: () => wrappedIcon }),
        ...(tooltip !== undefined && { tooltip }),
        ...(onClick !== undefined && { onClick }),
        ...(onMouseDown !== undefined && { onMouseDown }),
        ...(onContextMenu !== undefined && { onContextMenu }),
        // This one styles the backdrop of the badge while the one passed as a prop to the badge styles the badge itself.
        ...(lowerBadge && lowerBadgeSize ? { lowerBadgeSize: lowerBadgeSize } : {}),
        ...(lowerBadge ? { lowerBadge: lowerBadge } : {}),
        ...(upperBadge ? { upperBadge: upperBadge } : {}),
    };

    return (
        <ErrorBoundary>
            {visible && (
                <div
                    {...(id !== undefined ? { id } : {})}
                    className={mainContainerClass}
                >
                    <div className={pillContainerClass} >
                        <GuildedServerListItemPillComponent
                            unread={unread && showPill}
                            selected={selected && showPill}
                            hovered={hovered && showPill}
                            className={selected ? pillClassSelected : hovered ? pillClassHovered : pillClass}
                        />
                    </div>
                    <div
                        className={buttonContainerClass}
                    >
                        <GuildlessServerListItemComponent
                            showPill={false}
                            selected={selected}
                            className={buttonClass}
                            onMouseEnter={() => setHovered(true)}
                            onMouseLeave={() => setHovered(false)}
                            {...componentProps}
                        />
                    </div>
                </div>
            )}
        </ErrorBoundary>
    );
}

export interface DynamicDropdownProps extends React.ComponentProps<typeof SearchableSelect> {
    feedback?: string;
}

export const DynamicDropdown: React.FC<DynamicDropdownProps> = props => {
    return <SearchableSelect {...props} />;
};
