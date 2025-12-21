/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SliderProps {
    initialValue?: number;
    value?: number;
    minValue?: number;
    maxValue?: number;
    onValueChange?: (value: number) => void;
    onValueRender?: (value: number) => string;
    markers?: number[];
    stickToMarkers?: boolean;
    onMarkerRender?: (value: number) => string;
    renderMarker?: (value: number) => React.ReactNode;
    disabled?: boolean;
    mini?: boolean;
    hideBubble?: boolean;
    defaultValue?: number;
    orientation?: "horizontal" | "vertical";
    barClassName?: string;
    grabberClassName?: string;
    className?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
}
