/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { keyMap } from "./keymap";
import { VimContext } from "./vimContext";
import { Mode, VimStore } from "./vimStore";
import { Action, Motion, Operator } from "./vimTypes";

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
            const anchor = VimStore.visualAnchor!;
            this.ctx.moveCursor(anchor);
            VimStore.resetVisual();
            VimStore.setMode(Mode.NORMAL);
            return { block: true };
        }

        if (e.key === "v") {
            const offset = this.ctx.getOffset();
            VimStore.setMode(Mode.VISUAL);
            VimStore.setVisualAnchor(offset);
            VimStore.setVisualCursor(offset);
            return { block: true };
        }

        if (!isNaN(Number(e.key)) && Number(e.key) !== 0) {
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

        if (state.buffer && (key === "i" || key === "a")) {
            VimStore.setBuffer(state.buffer + key);
            this.refreshTimeout();
            return { block: true };
        }

        const compositeKey = state.buffer + key;
        if (state.buffer && keyMap[compositeKey]) {
            const command = keyMap[compositeKey];
            if (command instanceof Action) command.execute(this.ctx, count);
            if (command instanceof Motion) {
                const range = command.execute(this.ctx, count);
                this.ctx.moveCursor(range.end);
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
            if (state.mode === Mode.VISUAL) {
                const start = VimStore.visualAnchor!;
                const end = VimStore.visualCursor!;
                command.execute(this.ctx, start, end);
                VimStore.resetVisual();
                if (VimStore.mode !== Mode.INSERT) {
                    VimStore.setMode(Mode.NORMAL);
                }
                return { block: true };
            }

            if (state.buffer === key) {
                const text = this.ctx.getText();
                command.execute(this.ctx, 0, text.length);
                VimStore.resetBuffer();
            } else {
                VimStore.setBuffer(key);
                this.refreshTimeout();
            }
            return { block: true };
        }

        if (command instanceof Motion) {
            const range = command.execute(this.ctx, count);

            if (state.mode === Mode.VISUAL) {
                VimStore.setVisualCursor(range.end);
                this.ctx.setSelection(VimStore.visualAnchor!, VimStore.visualCursor!);
            } else if (!pendingOperatorKey) {
                this.ctx.moveCursor(range.end);
            }

            if (pendingOperatorKey) {
                const operator = keyMap[pendingOperatorKey];
                if (operator instanceof Operator) {
                    operator.execute(this.ctx, range.start, range.end);
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
