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
        const { selection } = this.editor;
        return (selection?.focus as VimPoint)
            ?? { path: [0, 0], offset: 0 };
    }

    moveTo(point: VimPoint) {
        Transforms.select(this.editor, {
            anchor: point,
            focus: point
        });
    }

    moveBy(delta: number) {
        const { editor } = this;
        const from = this.getPoint();

        const next =
            delta > 0
                ? Editor.after(editor, from, { unit: "offset", distance: delta })
                : Editor.before(editor, from, { unit: "offset", distance: -delta });

        if (next) {
            this.moveTo(next as VimPoint);
        }
    }

    moveLine(delta: number) {
        const { editor } = this;
        const current = this.getPoint();
        const { cursorColumn: desiredColumn } = VimStore;

        const goalCol =
            desiredColumn != null ? desiredColumn : current.offset;
        VimStore.setCursorColumn(goalCol);

        const [blockIndex] = current.path;

        const nextBlockIndex = blockIndex + delta;
        if (nextBlockIndex < 0 || nextBlockIndex >= editor.children.length) return;

        const nextText = editor.children[nextBlockIndex].children[0];
        const nextTextLength = nextText.text.length;

        const nextOffset = Math.min(goalCol, nextTextLength);

        const nextPoint = {
            path: [nextBlockIndex, 0],
            offset: nextOffset
        };

        this.moveTo(nextPoint);
    }


    wordForward(count: number) {
        const { editor } = this;
        let point = this.getPoint();

        for (let i = 0; i < count; i++) {
            const next = Editor.after(editor, point, { unit: "word" });
            if (!next) break;
            point = next as VimPoint;
        }

        this.moveTo(point);
    }

    wordBackward(count: number) {
        const { editor } = this;
        let point = this.getPoint();

        for (let i = 0; i < count; i++) {
            const next = Editor.before(editor, point, { unit: "word" });
            if (!next) break;
            point = next as VimPoint;
        }

        this.moveTo(point);
    }

    lineBoundary(which: "start" | "end"): VimPoint {
        const { editor } = this;
        const point = this.getPoint();
        const at =
            which === "start"
                ? Editor.start(editor, point.path)
                : Editor.end(editor, point.path);

        return (at as VimPoint) ?? point;
    }

    selectRange(anchor: VimPoint, focus: VimPoint) {
        Transforms.select(this.editor, { anchor, focus });
    }

    deleteRange(anchor: VimPoint, focus: VimPoint) {
        this.selectRange(anchor, focus);
        this.editor.deleteFragment();
    }

    insertTextAtCursor(text: string, before: boolean = false) {
        const point = this.getPoint();
        const insertPoint: VimPoint = before
            ? point
            : { path: point.path, offset: point.offset + 1 };
        Transforms.insertText(this.editor, text, { at: insertPoint });
    }
}
