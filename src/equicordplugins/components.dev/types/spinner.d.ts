/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { SpinnerType } from "../constants";

export type { SpinnerType };

export interface SpinnerTypeEnum {
    WANDERING_CUBES: "wanderingCubes";
    CHASING_DOTS: "chasingDots";
    PULSING_ELLIPSIS: "pulsingEllipsis";
    SPINNING_CIRCLE: "spinningCircle";
    SPINNING_CIRCLE_SIMPLE: "spinningCircleSimple";
    LOW_MOTION: "lowMotion";
}

export interface SpinnerProps {
    type?: SpinnerType;
    animated?: boolean;
    className?: string;
    itemClassName?: string;
    "aria-label"?: string;
}

export interface SpinnerComponent extends React.FC<SpinnerProps> {
    Type: SpinnerTypeEnum;
}
