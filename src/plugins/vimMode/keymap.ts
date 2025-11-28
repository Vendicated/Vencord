/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VimActions } from "./vimActions";
import { Mode, VimStore } from "./vimStore";
import { Action, Motion, Operator } from "./vimTypes";

const motion = (run: (ctx, count: number) => void) =>
    new Motion((ctx, count) => {
        const anchor = ctx.getPoint();
        run(ctx, count);
        return { anchor, focus: ctx.getPoint() };
    });

export const keyMap = {
    h: motion((ctx, n) => ctx.moveBy(-n)),
    l: motion((ctx, n) => ctx.moveBy(n)),
    j: motion((ctx, n) => ctx.moveLine(n)),
    k: motion((ctx, n) => ctx.moveLine(-n)),

    gg: new Motion(ctx => {
        const anchor = ctx.getPoint();
        ctx.goToStart();
        return { anchor, focus: ctx.getPoint() };
    }),

    G: new Motion(ctx => {
        const anchor = ctx.getPoint();
        ctx.goToEnd();
        return { anchor, focus: ctx.getPoint() };
    }),

    w: motion((ctx, n) => ctx.wordForward(n)),
    b: motion((ctx, n) => ctx.wordBackward(n)),

    iw: new Motion(ctx => ctx.innerWord()),
    aw: new Motion(ctx => ctx.aroundWord()),

    "0": new Motion(ctx => {
        const focus = ctx.lineBoundaryStart();
        return { anchor: focus, focus };
    }),

    "$": new Motion(ctx => {
        const anchor = ctx.getPoint();
        const focus = ctx.lineBoundaryEnd();
        return { anchor, focus };
    }),

    d: new Operator((ctx, a, f) => ctx.deleteRange(a, f)),
    c: new Operator((ctx, a, f) => {
        ctx.deleteRange(a, f);
        VimStore.setMode(Mode.INSERT);
    }),

    x: new Action((ctx, n) => ctx.deleteChars(n)),
    u: new Action(ctx => ctx.undo()),

    i: new Action(() => VimStore.setMode(Mode.INSERT)),

    go: new Action(() => VimActions.openQuickSwitcher()),
    "/": new Action(() => VimActions.openFind()),

    y: new Operator((ctx, a, f) => ctx.yank(a, f)),
    p: new Action(ctx => ctx.paste()),
    P: new Action(ctx => ctx.pasteBefore())
};
