/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VimContext } from "./vimContext";

export class Motion {
    constructor(
        public execute: (ctx: VimContext, count: number) => { start: number, end: number; }
    ) { }
}

export class Operator {
    constructor(
        public execute: (ctx: VimContext, start: number, end: number) => void
    ) { }
}

export class Action {
    constructor(
        public execute: (ctx: VimContext, count: number) => void
    ) { }
}

