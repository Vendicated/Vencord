/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";

import { currentEditor } from ".";
import { VimActions } from "./vimActions";
import { Mode, VimStore } from "./vimStore";
const Transforms = findByPropsLazy("insertNodes", "textToText");

class Vim {
    getSlate() {
        if (!currentEditor) return null;
        try {
            return currentEditor.getSlateEditor();
        } catch {
            return null;
        }
    }

    handleKey(key: string): { block: boolean; } {
        const slate = this.getSlate();
        const state = VimStore.getState();

        if (state.mode === Mode.INSERT) {
            if (key === "Escape") {
                VimStore.setMode(Mode.NORMAL);
                return { block: true };
            }
            return { block: false };
        }

        if (!isNaN(Number(key))) {
            const digit = Number(key);
            const newCount = (state.count ?? 0) * 10 + digit;
            VimStore.setCount(newCount);
            return { block: true };
        }

        const count = state.count ?? 1;

        // chord movements
        if (state.buffer === "g") {
            VimStore.resetBuffer();

            if (key === "g") {
                VimActions.scrollTop();
                return { block: true };
            }

            if (key === "o") {
                VimActions.openQuickSwitcher();
                return { block: true };
            }

            return { block: true };
        }

        // delete motions
        if (state.buffer === "d") {
            VimStore.resetBuffer();

            // dw
            if (key === "w") {
                for (let n = 0; n < count; n++) {
                    const text = this.getCurrentLineText(slate);
                    const start = this.getOffset(slate);
                    const end = this.findNextWordOffset(text, start);

                    this.setSelectionRange(slate, start, end);
                    this.deleteSelection(slate);
                }
                VimStore.resetBuffer();
                return { block: true };
            }

            // db
            if (key === "b") {
                for (let n = 0; n < count; n++) {
                    const text = this.getCurrentLineText(slate);
                    const start = this.getOffset(slate);
                    const end = this.findPrevWordOffset(text, start);
                    this.setSelectionRange(slate, end, start);
                    this.deleteSelection(slate);
                }
                VimStore.resetBuffer();
                return { block: true };
            }

            // dd
            if (key === "d") {
                const { path } = slate.selection.anchor;
                const linePath = path.slice(0, 2);
                Transforms.removeNodes(slate, { at: linePath });
                VimStore.resetBuffer();
                return { block: true };
            }

            // d$
            if (key === "$") {
                const text = this.getCurrentLineText(slate);
                const start = this.getOffset(slate);
                const end = text.length;
                this.setSelectionRange(slate, start, end);
                this.deleteSelection(slate);
                VimStore.resetBuffer();
                return { block: true };
            }

            return { block: true };
        }

        // change motions
        if (state.buffer === "c" || state.buffer === "ca") {
            if (key === "a") {
                VimStore.setBuffer("ca");
                VimStore.startTimeout(1500, () => VimStore.resetBuffer());
                return { block: true };
            }

            if (state.buffer === "ca" && key === "w") {
                const text = this.getCurrentLineText(slate);
                const cursor = this.getOffset(slate);

                const start = this.findPrevWordOffset(text, cursor);
                const end = this.findNextWordOffset(text, cursor);

                let finalStart = start;
                let finalEnd = end;

                while (finalStart > 0 && /\s/.test(text[finalStart - 1])) finalStart--;
                while (finalEnd < text.length && /\s/.test(text[finalEnd])) finalEnd++;

                this.setSelectionRange(slate, finalStart, finalEnd);
                this.deleteSelection(slate);

                VimStore.resetBuffer();
                VimStore.setMode(Mode.INSERT);

                return { block: true };
            }
            VimStore.resetBuffer();
            return { block: true };
        }

        // chord triggers
        if (key === "g") {
            VimStore.setBuffer("g");
            VimStore.startTimeout(1500, () => VimStore.resetBuffer());
            return { block: true };
        }
        if (key === "d") {
            VimStore.setBuffer("d");
            VimStore.startTimeout(1500, () => VimStore.resetBuffer());
            return { block: true };
        }
        if (key === "c") {
            VimStore.setBuffer("c");
            VimStore.startTimeout(1500, () => VimStore.resetBuffer());
            return { block: true };
        }

        // scroll
        if (key === "j") {
            VimActions.scrollDown(count);
            VimStore.resetBuffer();
            return { block: true };
        }

        if (key === "k") {
            VimActions.scrollUp(count);
            VimStore.resetBuffer();
            return { block: true };
        }

        if (key === "G") {
            VimActions.scrollBottom();
            VimStore.resetBuffer();
            return { block: true };
        }

        if (key === "i") {
            VimStore.setMode(Mode.INSERT);
            return { block: true };
        }

        // cursor movements
        if (key === "h") {
            const slate = this.getSlate();
            for (let i = 0; i < count; i++) {
                this.moveCursor(slate, -1);
            }
            VimStore.resetBuffer();
            return { block: true };
        }

        if (key === "l") {
            const slate = this.getSlate();
            for (let i = 0; i < count; i++) {
                this.moveCursor(slate, +1);
            }
            VimStore.resetBuffer();
            return { block: true };
        }

        if (key === "w") {
            for (let n = 0; n < count; n++) {
                const text = this.getCurrentLineText(slate);
                const { anchor } = slate.selection;
                const newOffset = this.findNextWordOffset(text, anchor.offset);

                this.moveCursor(slate, newOffset - anchor.offset);
            }
            VimStore.resetBuffer();
            return { block: true };
        }

        if (key === "b") {
            for (let n = 0; n < count; n++) {
                const text = this.getCurrentLineText(slate);
                const { anchor } = slate.selection;
                const newOffset = this.findPrevWordOffset(text, anchor.offset);
                this.moveCursor(slate, newOffset - anchor.offset);
            }
            VimStore.resetBuffer();
            return { block: true };
        }

        if (key === "u") {
            slate.undo();
            VimStore.resetBuffer();
            return { block: true };
        }

        return { block: true };
    }

    // helpers
    moveCursor(editor, delta) {
        const { selection } = editor;
        if (!selection) return;

        const { anchor } = selection;
        const newOffset = Math.max(0, anchor.offset + delta);

        Transforms.setSelection(editor, {
            anchor: { path: anchor.path, offset: newOffset },
            focus: { path: anchor.path, offset: newOffset }
        });
    }

    getCurrentLineText(editor) {
        const { selection } = editor;
        if (!selection) return "";
        const { anchor } = selection;
        const [node] = editor.children[anchor.path[0]].children;
        return node.text || "";
    }

    findNextWordOffset(text, offset) {
        const len = text.length;
        let i = offset;
        while (i < len && /\S/.test(text[i])) i++;
        while (i < len && /\s/.test(text[i])) i++;
        return i;
    }

    findPrevWordOffset(text, offset) {
        let i = offset;
        while (i > 0 && /\s/.test(text[i - 1])) i--;
        while (i > 0 && /\S/.test(text[i - 1])) i--;
        return i;
    }

    setSelectionRange(editor, startOffset, endOffset) {
        const { anchor } = editor.selection;

        Transforms.setSelection(editor, {
            anchor: { path: anchor.path, offset: startOffset },
            focus: { path: anchor.path, offset: endOffset }
        });
    }

    deleteSelection(editor) {
        editor.deleteFragment();
    }

    getOffset(editor) {
        return editor.selection.anchor.offset;
    }
}

export const vim = new Vim();
