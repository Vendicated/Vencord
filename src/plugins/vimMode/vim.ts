/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { keyMap } from "./keymap";
import { Editor, VimContext } from "./vimContext";
import { Mode, VimStore } from "./vimStore";
import { Action, Motion, Operator, VimPoint } from "./vimTypes";

const TIMEOUT_MS = 1500;

class Vim {
    ctx = new VimContext();

    refreshTimeout = () => {
        VimStore.startTimeout(TIMEOUT_MS, () => VimStore.resetBuffer());
    };

    handleKey(e: KeyboardEvent): { block: boolean; } {
        const state = VimStore.getState();

        const MODIFIERS = new Set(["Shift", "Control", "Alt", "Meta"]);
        if (MODIFIERS.has(e.key)) return { block: false };

        if (state.mode === Mode.INSERT) {
            if (e.key === "Escape") {
                VimStore.setMode(Mode.NORMAL);
                return { block: true };
            }
            return { block: false };
        }

        if (state.mode === Mode.VISUAL && e.key === "Escape") {
            const anchor = VimStore.visualAnchorPoint!;
            this.ctx.moveTo(anchor);
            VimStore.resetVisual();
            VimStore.setMode(Mode.NORMAL);
            return { block: true };
        }

        if (e.key === "v") {
            const point = this.ctx.getPoint();
            VimStore.setMode(Mode.VISUAL);
            VimStore.setVisualAnchor(point);
            return { block: true };
        }

        if (!isNaN(Number(e.key)) && e.key !== "0") {
            const digit = Number(e.key);
            const newCount = (state.count ?? 0) * 10 + digit;
            VimStore.setCount(newCount);
            this.refreshTimeout();
            return { block: true };
        }

        const { key } = e;
        const count = state.count ?? 1;

        if (key === "g" && state.buffer === "") {
            VimStore.setBuffer("g");
            this.refreshTimeout();
            return { block: true };
        }

        if (key === "f" || key === "F") {
            key === "f" ? VimStore.setBuffer("f") : VimStore.setBuffer("F");
            this.refreshTimeout();
            return { block: true };
        }

        if (state.buffer === "f" || state.buffer === "F") {
            const start = this.ctx.getPoint();
            const char = key;
            const { editor } = this.ctx;

            const textNode = editor.children[start.path[0]].children[0];
            const { text } = textNode;

            const forward = state.buffer === "f";

            const from = forward
                ? start.offset + 1
                : start.offset - 1;

            const target = forward
                ? text.indexOf(char, from)
                : text.lastIndexOf(char, from);

            if (target !== -1) {
                const focus: VimPoint = { path: start.path, offset: target };

                if (state.mode === Mode.VISUAL) {
                    this.ctx.selectRange(VimStore.visualAnchorPoint!, focus);
                } else {
                    this.ctx.moveTo(focus);
                }
            }

            VimStore.resetBuffer();
            return { block: true };
        }


        if (state.buffer && (key === "i" || key === "a")) {
            VimStore.setBuffer(state.buffer + key);
            this.refreshTimeout();
            return { block: true };
        }

        const compositeKey = state.buffer + key;
        if (state.buffer && keyMap[compositeKey]) {
            const command = keyMap[compositeKey];
            if (command instanceof Motion) {
                const { anchor, focus } = command.execute(this.ctx, count);
                this.ctx.moveTo(focus);
            } else if (command instanceof Action) {
                command.execute(this.ctx, count);
            }
            VimStore.resetBuffer();
            return { block: true };
        }

        let commandKey = key;
        let pendingOperatorKey = state.buffer;

        if (state.buffer.length > 1) {
            const modifier = state.buffer.slice(1);
            pendingOperatorKey = state.buffer[0];
            commandKey = modifier + key;
        }

        const command = keyMap[commandKey];
        if (!command) return { block: true };

        if (command instanceof Operator) {
            const currentPoint = this.ctx.getPoint();

            if (state.mode === Mode.VISUAL) {
                const anchor = VimStore.visualAnchorPoint ?? this.ctx.getPoint();
                const focus = this.ctx.getPoint();
                command.execute(this.ctx, anchor, focus);
                VimStore.resetVisual();
                if (VimStore.mode !== Mode.INSERT) VimStore.setMode(Mode.NORMAL);
                return { block: true };
            }

            if (state.buffer === key) {
                const { editor } = this.ctx;
                const lineStart = Editor.start(editor, currentPoint.path) as VimPoint;
                const lineEnd = Editor.end(editor, currentPoint.path) as VimPoint;

                command.execute(this.ctx, lineStart, lineEnd);

                if (VimStore.mode !== Mode.INSERT) {
                    VimStore.setMode(Mode.NORMAL);
                }

                VimStore.resetBuffer();
                return { block: true };
            }

            VimStore.setBuffer(key);
            this.refreshTimeout();
            return { block: true };
        }

        if (command instanceof Motion) {
            const { anchor, focus } = command.execute(this.ctx, count);

            if (state.mode === Mode.VISUAL) {
                const anchor = VimStore.visualAnchorPoint ?? focus;
                this.ctx.selectRange(anchor, focus);
            } else if (!pendingOperatorKey) {
                this.ctx.moveTo(focus);
            }

            if (pendingOperatorKey) {
                const operator = keyMap[pendingOperatorKey];
                if (operator instanceof Operator) {
                    operator.execute(this.ctx, anchor, focus);
                }
            }

            VimStore.resetBuffer();
            return { block: true };
        }

        if (command instanceof Action) {
            command.execute(this.ctx, count);
            VimStore.resetBuffer();
            return { block: true };
        }

        return { block: true };
    }
}

export const vim = new Vim();
