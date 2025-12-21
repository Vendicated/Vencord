/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type SpinnerType = "wanderingCubes" | "chasingDots" | "pulsingEllipsis" | "spinningCircle" | "spinningCircleSimple" | "lowMotion";

export interface SpinnerProps {
    type?: SpinnerType;
    animated?: boolean;
    className?: string;
    itemClassName?: string;
    "aria-label"?: string;
}
