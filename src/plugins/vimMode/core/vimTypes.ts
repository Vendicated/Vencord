/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { VimContext } from "./vimContext";

export type VimPoint = {
    path: number[];
    offset: number;
};

export type VimRange = {
    anchor: VimPoint;
    focus: VimPoint;
};

export class Motion {
    constructor(
        public execute: (ctx: VimContext, count: number) => VimRange
    ) { }
}

export class Operator {
    constructor(
        public execute: (ctx: VimContext, anchor: VimPoint, focus: VimPoint) => void
    ) { }
}

export class Action {
    constructor(
        public execute: (ctx: VimContext, count: number) => void
    ) { }
}
