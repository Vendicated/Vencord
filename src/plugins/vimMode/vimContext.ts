/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";

import { currentEditor } from ".";
import { Mode, VimStore } from "./vimStore";

const Transforms = findByPropsLazy("insertNodes", "textToText");

export class VimContext {
    get editor() {
        return currentEditor.getSlateEditor();
    }

    getOffset(): number {
        const { selection } = this.editor;
        const state = VimStore.getState();

        if (state.mode === Mode.VISUAL && VimStore.visualCursor != null) {
            return VimStore.visualCursor;
        }

        return selection?.focus.offset ?? 0;
    }

    getText(): string {
        const { anchor } = this.editor.selection;
        if (!anchor) return "";
        const [node] = this.editor.children[anchor.path[0]].children;
        return node.text || "";
    }

    moveCursor(offset: number) {
        const { anchor } = this.editor.selection;
        const textLen = this.getText().length;
        const safeOffset = Math.max(0, Math.min(offset, textLen));
        Transforms.setSelection(this.editor, {
            anchor: { path: anchor.path, offset: safeOffset },
            focus: { path: anchor.path, offset: safeOffset }
        });
    }

    deleteRange(start: number, end: number) {
        const { anchor } = this.editor.selection;
        const low = Math.min(start, end);
        const high = Math.max(start, end);
        Transforms.setSelection(this.editor, {
            anchor: { path: anchor.path, offset: low },
            focus: { path: anchor.path, offset: high }
        });
        this.editor.deleteFragment();
    }

    findNextWord(text: string, start: number): number {
        const len = text.length;
        let i = start;
        if (i < len && /\S/.test(text[i])) i++;
        while (i < len && /\S/.test(text[i])) i++;
        while (i < len && /\s/.test(text[i])) i++;
        return i;
    }

    findPrevWord(text: string, start: number): number {
        let i = start;
        while (i > 0 && /\s/.test(text[i - 1])) i--;
        while (i > 0 && /\S/.test(text[i - 1])) i--;
        return i;
    }

    setSelection(start: number, end: number) {
        const { editor } = this;
        const { selection } = editor;
        if (!selection) return;

        const { anchor } = selection;

        const low = Math.min(start, end);
        const high = Math.max(start, end);

        Transforms.select(editor, {
            anchor: { path: anchor.path, offset: low },
            focus: { path: anchor.path, offset: high }
        });
    }
}
