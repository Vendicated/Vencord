/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";

import { keyMap } from "./keymap";
import { VimActions } from "./vimActions";
import { Editor, VimContext } from "./vimContext";
import { Mode, VimStore } from "./vimStore";
import { Action, Motion, Operator, VimPoint } from "./vimTypes";

const TIMEOUT_MS = 1500;
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta"]);

type VimState = ReturnType<typeof VimStore.getState>;

class Vim {
    ctx = new VimContext();

    refreshTimeout() {
        VimStore.startTimeout(TIMEOUT_MS, () => VimStore.resetBuffer());
    }

    setBuffer(buffer: string) {
        VimStore.setBuffer(buffer);
        this.refreshTimeout();
    }

    isCountKey(state: VimState, key: string) {
        if (key === "0") return state.count !== null && state.count !== undefined;
        return key >= "1" && key <= "9";
    }

    handleInsertModeKey(key: string): { block: boolean; } {
        if (key === "Escape") {
            VimStore.setMode(Mode.NORMAL);
        }
        return { block: false };
    }

    handleVisualEscape(): { block: boolean; } {
        const anchor = VimStore.visualAnchorPoint!;
        this.ctx.moveTo(anchor);
        VimStore.resetVisual();
        VimStore.setMode(Mode.NORMAL);
        return { block: true };
    }

    enterVisualMode(): { block: boolean; } {
        const point = this.ctx.getPoint();
        VimStore.setMode(Mode.VISUAL);
        VimStore.setVisualAnchor(point);
        return { block: true };
    }

    handleCountKey(state: VimState, key: string): { block: boolean; } | null {
        if (!this.isCountKey(state, key)) return null;

        const digit = Number(key);
        const newCount = (state.count ?? 0) * 10 + digit;
        VimStore.setCount(newCount);
        this.refreshTimeout();
        return { block: true };
    }

    handleScrollKey(state: VimState, key: string, count: number): { block: boolean; } | null {
        if (
            (key !== "j" && key !== "k") ||
            !Settings.plugins.VimMode.vimChatScroll ||
            state.mode !== Mode.NORMAL
        ) {
            return null;
        }

        if (key === "j") VimActions.scrollDown(count);
        if (key === "k") VimActions.scrollUp(count);

        VimStore.resetBuffer();
        return { block: true };
    }

    handleFindTarget(state: VimState, key: string): { block: boolean; } | null {
        if (state.buffer !== "f" && state.buffer !== "F") return null;

        const start = this.ctx.getPoint();
        const { editor } = this.ctx;

        const textNode = editor.children[start.path[0]].children[0];
        const { text } = textNode;

        const forward = state.buffer === "f";
        const from = forward ? start.offset + 1 : start.offset - 1;
        const target = forward ? text.indexOf(key, from) : text.lastIndexOf(key, from);

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

    handleCompositeCommand(state: VimState, key: string, count: number): { block: boolean; } | null {
        if (!state.buffer) return null;

        const compositeKey = state.buffer + key;
        const command = keyMap[compositeKey];

        if (!command) return null;

        if (command instanceof Motion) {
            const { anchor, focus } = command.execute(this.ctx, count);
            this.ctx.moveTo(focus);
        } else if (command instanceof Action) {
            command.execute(this.ctx, count);
        }

        VimStore.resetBuffer();
        return { block: true };
    }

    handleOperatorCommand(operator: Operator, key: string, state: VimState) {
        const point = this.ctx.getPoint();

        if (state.mode === Mode.VISUAL) {
            const anchor = VimStore.visualAnchorPoint ?? point;
            const focus = point;

            operator.execute(this.ctx, anchor, focus);

            VimStore.resetVisual();
            if (VimStore.mode !== Mode.INSERT) {
                VimStore.setMode(Mode.NORMAL);
            }
            return;
        }

        if (state.buffer === key) {
            const { editor } = this.ctx;
            const lineStart = Editor.start(editor, point.path) as VimPoint;
            const lineEnd = Editor.end(editor, point.path) as VimPoint;

            operator.execute(this.ctx, lineStart, lineEnd);

            if (VimStore.mode !== Mode.INSERT) {
                VimStore.setMode(Mode.NORMAL);
            }

            VimStore.resetBuffer();
            return;
        }

        this.setBuffer(key);
    }

    handleMotionCommand(
        motion: Motion,
        count: number,
        state: VimState,
        pendingOperatorKey?: string
    ) {
        const { anchor, focus } = motion.execute(this.ctx, count);

        if (state.mode === Mode.VISUAL) {
            const visualAnchor = VimStore.visualAnchorPoint ?? focus;
            this.ctx.selectRange(visualAnchor, focus);
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
    }

    handleKey(e: KeyboardEvent): { block: boolean; } {
        const state = VimStore.getState();
        const { key } = e;

        if (MODIFIER_KEYS.has(key)) {
            return { block: false };
        }

        if (state.mode === Mode.NORMAL && key === "Escape") {
            return { block: false };
        }

        if (state.mode === Mode.INSERT) {
            return this.handleInsertModeKey(key);
        }

        if (state.mode === Mode.VISUAL && key === "Escape") {
            return this.handleVisualEscape();
        }

        if (key === "v" && state.buffer !== "f" && state.buffer !== "F") {
            return this.enterVisualMode();
        }

        const countHandled = this.handleCountKey(state, key);
        if (countHandled) return countHandled;

        const count = state.count ?? 1;

        const scrollHandled = this.handleScrollKey(state, key, count);
        if (scrollHandled) return scrollHandled;

        if (key === "g" && !state.buffer) {
            this.setBuffer("g");
            return { block: true };
        }

        if (key === "f" || key === "F") {
            this.setBuffer(key);
            return { block: true };
        }

        const findHandled = this.handleFindTarget(state, key);
        if (findHandled) return findHandled;

        if (state.buffer && (key === "i" || key === "a")) {
            this.setBuffer(state.buffer + key);
            return { block: true };
        }

        const compositeHandled = this.handleCompositeCommand(state, key, count);
        if (compositeHandled) return compositeHandled;

        let commandKey = key;
        let pendingOperatorKey = state.buffer;

        if (state.buffer.length > 1) {
            const modifier = state.buffer.slice(1);
            pendingOperatorKey = state.buffer[0];
            commandKey = modifier + key;
        }

        const command = keyMap[commandKey];
        if (!command) {
            return { block: true };
        }

        if (command instanceof Operator) {
            this.handleOperatorCommand(command, key, state);
            return { block: true };
        }

        if (command instanceof Motion) {
            this.handleMotionCommand(command, count, state, pendingOperatorKey);
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
