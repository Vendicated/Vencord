/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Moment } from "moment";

import type { TimestampDisplayFormat, TooltipPosition } from "../constants";

export type TimestampFormat = TimestampDisplayFormat;

export type { TooltipPosition };

export interface TimestampProps {
    timestamp: Date | Moment;
    timestampFormat?: TimestampFormat;
    compact?: boolean;
    cozyAlt?: boolean;
    isInline?: boolean;
    isVisibleOnlyOnHover?: boolean;
    isEdited?: boolean;
    id?: string;
    className?: string;
    children?: React.ReactNode;
    tooltipPosition?: TooltipPosition;
}
