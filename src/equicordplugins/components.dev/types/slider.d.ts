/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { SliderOrientation } from "../constants";

export type { SliderOrientation };

export interface SliderProps {
    initialValue?: number;
    value?: number;
    minValue?: number;
    maxValue?: number;
    onValueChange?: (value: number) => void;
    asValueChanges?: (value: number) => void;
    onValueRender?: (value: number) => string | null;
    markers?: number[];
    stickToMarkers?: boolean;
    equidistant?: boolean;
    onMarkerRender?: (value: number) => string | React.ReactNode | null;
    renderMarker?: (value: number) => React.ReactNode;
    getAriaValueText?: (value: number) => string;
    keyboardStep?: number;
    disabled?: boolean;
    mini?: boolean;
    hideBubble?: boolean;
    defaultValue?: number;
    orientation?: SliderOrientation;
    markerPosition?: 0 | 1;
    barStyles?: React.CSSProperties;
    fillStyles?: React.CSSProperties;
    grabberStyles?: React.CSSProperties;
    barClassName?: string;
    grabberClassName?: string;
    className?: string;
    "aria-hidden"?: boolean;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
}
