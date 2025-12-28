/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";

const marginCls = classNameFactory("vc-margin-");

const Directions = ["top", "bottom", "left", "right"] as const;
const Sizes = [8, 16, 20] as const;

export type MarginDirection = (typeof Directions)[number];
export type MarginSize = (typeof Sizes)[number];

export const Margins: Record<`${MarginDirection}${MarginSize}`, string> = {} as any;

export function generateMarginCss() {
    let css = "";

    for (const direction of Directions) {
        for (const size of Sizes) {
            const cl = marginCls(`${direction}-${size}`);
            Margins[`${direction}${size}`] = cl;
            css += `.${cl}{margin-${direction}:${size}px;}`;
        }
    }

    return css;
}
