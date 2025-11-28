/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VimActions } from "./vimActions";
import { Editor } from "./vimContext";
import { Mode, VimStore } from "./vimStore";
import { Action, Motion, Operator, VimPoint } from "./vimTypes";

export const keyMap: Record<string, Motion | Operator | Action> = {
    "h": new Motion((ctx, count) => {
        const start = ctx.getPoint();
        ctx.moveBy(-count);
        const focus = ctx.getPoint();
        VimStore.setCursorColumn(null);
        return { anchor: start, focus };
    }),

    "l": new Motion((ctx, count) => {
        const start = ctx.getPoint();
        ctx.moveBy(count);
        const focus = ctx.getPoint();
        VimStore.setCursorColumn(null);
        return { anchor: start, focus };
    }),

    "j": new Motion((ctx, count) => {
        const start = ctx.getPoint();
        ctx.moveLine(count);
        const focus = ctx.getPoint();
        return { anchor: start, focus };
    }),

    "k": new Motion((ctx, count) => {
        const start = ctx.getPoint();
        ctx.moveLine(-count);
        const focus = ctx.getPoint();
        return { anchor: start, focus };
    }),

    "gg": new Motion(ctx => {
        const start = ctx.getPoint();
        const focus: VimPoint = { path: [0, 0], offset: 0 };
        ctx.moveTo(focus);
        return { anchor: start, focus };
    }),

    "G": new Motion(ctx => {
        const start = ctx.getPoint();
        const { editor } = ctx;
        const lastBlockIndex = editor.children.length - 1;
        const focus =
            (Editor.end(editor, [lastBlockIndex]) as VimPoint)
            ?? { path: [lastBlockIndex, 0], offset: 0 };

        ctx.moveTo(focus);
        return { anchor: start, focus };
    }),

    "w": new Motion((ctx, count) => {
        const start = ctx.getPoint();
        ctx.wordForward(count);
        const focus = ctx.getPoint();
        return { anchor: start, focus };
    }),

    "iw": new Motion(ctx => {
        const { editor } = ctx;
        const point = ctx.getPoint();

        const textNode = editor.children[point.path[0]].children[0];
        const { text } = textNode;

        let start = point.offset;
        let end = point.offset;

        while (start > 0 && /\S/.test(text[start - 1])) start--;
        while (end < text.length && /\S/.test(text[end])) end++;

        const anchor = {
            path: point.path,
            offset: start
        };

        const focus = {
            path: point.path,
            offset: end
        };

        return { anchor, focus };
    }),

    "aw": new Motion(ctx => {
        const point = ctx.getPoint();
        const { editor } = ctx;
        const textNode = editor.children[point.path[0]].children[0];
        const { text } = textNode;

        let start = point.offset;
        let end = point.offset;

        while (start > 0 && /\w/.test(text[start - 1])) start--;
        while (end < text.length && /\w/.test(text[end])) end++;

        while (end < text.length && /\s/.test(text[end])) end++;

        const anchor = {
            path: point.path,
            offset: start
        };
        const focus = {
            path: point.path,
            offset: end
        };

        return { anchor, focus };
    }),

    "b": new Motion((ctx, count) => {
        const start = ctx.getPoint();
        ctx.wordBackward(count);
        const focus = ctx.getPoint();
        return { anchor: start, focus };
    }),

    "0": new Motion(ctx => {
        const focus = ctx.lineBoundary("start");
        return { anchor: focus, focus };
    }),

    "$": new Motion(ctx => {
        const start = ctx.getPoint();
        const focus = ctx.lineBoundary("end");
        return { anchor: start, focus };
    }),

    "d": new Operator((ctx, anchor, focus) => {
        ctx.deleteRange(anchor, focus);
    }),

    "c": new Operator((ctx, anchor, focus) => {
        ctx.deleteRange(anchor, focus);
        VimStore.setMode(Mode.INSERT);
    }),

    "x": new Action((ctx, count) => {
        const start = ctx.getPoint();
        const focus: VimPoint = { path: start.path, offset: start.offset + count };
        ctx.deleteRange(start, focus);
    }),

    "u": new Action(ctx => ctx.editor.undo()),

    "i": new Action(() => VimStore.setMode(Mode.INSERT)),

    "go": new Action(() => {
        VimActions.openQuickSwitcher();
    }),

    "y": new Operator((ctx, anchor, focus) => {
        const { editor } = ctx;
        const fragment = Editor.fragment(editor, { anchor, focus });
        const text = fragment
            .map(n => n.children?.map(c => c.text).join("") ?? "")
            .join("\n");
        VimStore.setRegister(text);
    }),

    "p": new Action(ctx => {
        const text = VimStore.getRegister();
        if (!text) return;
        ctx.insertTextAtCursor(text, false);
    }),

    "P": new Action(ctx => {
        const text = VimStore.getRegister();
        if (!text) return;
        ctx.insertTextAtCursor(text, true);
    }),

    "/": new Action(() => {
        VimActions.openFind();
    })
};
