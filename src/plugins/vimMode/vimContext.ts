/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";

import { currentEditor } from ".";
import { VimStore } from "./vimStore";
import type { VimPoint } from "./vimTypes";

const Transforms = findByPropsLazy("insertNodes", "textToText");
export const Editor = findByPropsLazy("after", "levels");

export class VimContext {
    get editor() {
        return currentEditor.getSlateEditor();
    }

    getPoint(): VimPoint {
        return (this.editor.selection?.focus as VimPoint)
            ?? { path: [0, 0], offset: 0 };
    }

    moveTo(point: VimPoint) {
        Transforms.select(this.editor, { anchor: point, focus: point });
    }

    moveBy(delta: number) {
        const from = this.getPoint();
        const next =
            delta > 0
                ? Editor.after(this.editor, from, { unit: "offset", distance: delta })
                : Editor.before(this.editor, from, { unit: "offset", distance: -delta });

        if (next) {
            VimStore.setCursorColumn(null);
            this.moveTo(next as VimPoint);
        }
    }

    moveLine(delta: number) {
        const point = this.getPoint();
        const [block] = point.path;
        const nextBlock = block + delta;
        const textNodes = this.editor.children;

        if (nextBlock < 0 || nextBlock >= textNodes.length) return;

        const desired = VimStore.cursorColumn ?? point.offset;
        VimStore.setCursorColumn(desired);

        const nextText = textNodes[nextBlock].children[0];
        const offset = Math.min(desired, nextText.text.length);

        this.moveTo({ path: [nextBlock, 0], offset });
    }

    goToStart() {
        this.moveTo({ path: [0, 0], offset: 0 });
    }

    goToEnd() {
        const textNodes = this.editor.children;
        const last = textNodes.length - 1;
        const end = Editor.end(this.editor, [last]) as VimPoint;
        this.moveTo(end);
    }

    lineBoundaryStart(): VimPoint {
        return (Editor.start(this.editor, this.getPoint().path) as VimPoint)
            ?? this.getPoint();
    }

    lineBoundaryEnd(): VimPoint {
        return (Editor.end(this.editor, this.getPoint().path) as VimPoint)
            ?? this.getPoint();
    }

    wordForward(count: number) {
        let point = this.getPoint();

        for (let i = 0; i < count; i++) {
            const next = Editor.after(this.editor, point, { unit: "word" });
            if (!next) break;
            point = next as VimPoint;
        }

        this.moveTo(point);
    }

    wordBackward(count: number) {
        let point = this.getPoint();

        for (let i = 0; i < count; i++) {
            const next = Editor.before(this.editor, point, { unit: "word" });
            if (!next) break;
            point = next as VimPoint;
        }

        this.moveTo(point);
    }

    innerWord() {
        const point = this.getPoint();
        const textNode = this.editor.children[point.path[0]].children[0];
        const { text } = textNode;

        let start = point.offset;
        let end = point.offset;

        while (start > 0 && /\S/.test(text[start - 1])) start--;
        while (end < text.length && /\S/.test(text[end])) end++;

        const anchor = { path: point.path, offset: start };
        const focus = { path: point.path, offset: end };

        return { anchor, focus };
    }

    aroundWord() {
        const point = this.getPoint();
        const textNode = this.editor.children[point.path[0]].children[0];
        const { text } = textNode;

        let start = point.offset;
        let end = point.offset;

        while (start > 0 && /\w/.test(text[start - 1])) start--;
        while (end < text.length && /\w/.test(text[end])) end++;
        while (end < text.length && /\s/.test(text[end])) end++;

        const anchor = { path: point.path, offset: start };
        const focus = { path: point.path, offset: end };

        return { anchor, focus };
    }

    selectRange(anchor: VimPoint, focus: VimPoint) {
        Transforms.select(this.editor, { anchor, focus });
    }

    deleteRange(anchor: VimPoint, focus: VimPoint) {
        this.selectRange(anchor, focus);
        this.editor.deleteFragment();
    }

    yank(anchor: VimPoint, focus: VimPoint) {
        const fragment = Editor.fragment(this.editor, { anchor, focus });
        const text = fragment
            .map(n => n.children?.map(c => c.text).join("") ?? "")
            .join("\n");
        VimStore.setRegister(text);
    }

    paste() {
        const text = VimStore.getRegister();
        if (!text) return;
        Transforms.insertText(this.editor, text, { at: this.getPoint() });
    }

    pasteBefore() {
        const text = VimStore.getRegister();
        if (!text) return;
        Transforms.insertText(this.editor, text, { at: this.getPoint() });
    }

    deleteChars(count: number) {
        const start = this.getPoint();
        const focus = { path: start.path, offset: start.offset + count };
        this.deleteRange(start, focus);
    }

    undo() {
        this.editor.undo();
    }

    toggleCase(count: number) {
        const start = this.getPoint();
        const { path, offset } = start;
        const [node] = Editor.node(this.editor, path);
        const { text } = node;
        const end = Math.min(offset + count, text.length);

        const charsToToggle = text.slice(offset, end);
        const toggledChunk = charsToToggle.replace(/[a-z]/gi, c =>
            c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()
        );

        Editor.withoutNormalizing(this.editor, () => {
            Transforms.delete(this.editor, {
                at: {
                    anchor: { path, offset },
                    focus: { path, offset: end }
                }
            });
            Transforms.insertText(this.editor, toggledChunk, {
                at: { path, offset }
            });
        });

        const next = Editor.after(this.editor, start, { unit: "offset", distance: count });
        this.moveTo(next ? next as VimPoint : start);
    }
}
