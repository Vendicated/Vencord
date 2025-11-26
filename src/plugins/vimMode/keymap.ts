/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VimActions } from "./vimActions";
import { Mode, VimStore } from "./vimStore";
import { Action, Motion, Operator } from "./vimTypes";

export const keyMap: Record<string, Motion | Operator | Action> = {
    "h": new Motion((ctx, count) => {
        const pos = Math.max(0, ctx.getOffset() - count);
        return { start: pos, end: pos };
    }),
    "l": new Motion((ctx, count) => {
        const pos = ctx.getOffset() + count;
        return { start: pos, end: pos };
    }),
    "w": new Motion((ctx, count) => {
        const text = ctx.getText();
        let pos = ctx.getOffset();
        for (let i = 0; i < count; i++) pos = ctx.findNextWord(text, pos);
        return { start: ctx.getOffset(), end: pos };
    }),
    "b": new Motion((ctx, count) => {
        const text = ctx.getText();
        let pos = ctx.getOffset();
        for (let i = 0; i < count; i++) pos = ctx.findPrevWord(text, pos);
        return { start: ctx.getOffset(), end: pos };
    }),
    "iw": new Motion(ctx => {
        const current = ctx.getOffset();
        const text = ctx.getText();
        let start = current;
        let end = current;
        while (start > 0 && /\S/.test(text[start - 1])) start--;
        while (end < text.length && /\S/.test(text[end])) end++;
        return { start, end };
    }),
    "0": new Motion(() => ({ start: 0, end: 0 })),
    "$": new Motion(ctx => {
        const current = ctx.getOffset();
        const len = ctx.getText().length;
        return { start: current, end: len };
    }),
    "gg": new Motion(() => ({ start: 0, end: 0 })),

    "d": new Operator((ctx, start, end) => {
        ctx.deleteRange(start, end);
    }),
    "c": new Operator((ctx, start, end) => {
        ctx.deleteRange(start, end);
        VimStore.setMode(Mode.INSERT);
    }),

    "x": new Action((ctx, count) => {
        const curr = ctx.getOffset();
        ctx.deleteRange(curr, curr + count);
    }),
    "u": new Action(ctx => ctx.editor.undo()),
    "j": new Action((_, count) => VimActions.scrollDown(count)),
    "k": new Action((_, count) => VimActions.scrollUp(count)),
    "G": new Action(() => VimActions.scrollBottom()),
    "i": new Action(() => VimStore.setMode(Mode.INSERT)),
    "go": new Action(() => {
        VimActions.openQuickSwitcher();
    }),
};
