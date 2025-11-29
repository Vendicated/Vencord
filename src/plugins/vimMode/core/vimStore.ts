/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";

import type { VimPoint } from "./vimTypes";

export enum Mode {
    NORMAL = "NORMAL",
    INSERT = "INSERT",
    VISUAL = "VISUAL"
}

export interface VimState {
    mode: Mode;
    buffer: string;
    count: number | null;
}

export const VimStore = proxyLazyWebpack(() => {
    const { Store } = Flux;

    class VimStoreClass extends Store {
        mode: Mode = Mode.NORMAL;
        buffer = "";
        count: number | null = null;
        timeout: number | null = null;
        visualAnchorPoint: VimPoint | null = null;
        cursorColumn: number | null = null;
        unnamedReg: string = "";

        getState(): VimState {
            return {
                mode: this.mode,
                buffer: this.buffer,
                count: this.count,
            };
        }

        setMode(mode: Mode) {
            this.mode = mode;
            this.buffer = "";
            this.count = null;
            this.clearTimeout();
            this.emitChange();
        }

        setBuffer(buf: string) {
            this.buffer = buf;
            this.emitChange();
        }

        setCount(n: number) {
            this.count = n;
            this.emitChange();
        }

        resetBuffer() {
            this.buffer = "";
            this.count = null;
            this.clearTimeout();
            this.emitChange();
        }

        startTimeout(ms: number, fn: () => void) {
            this.clearTimeout();
            this.timeout = window.setTimeout(() => {
                this.timeout = null;
                fn();
            }, ms);
        }

        clearTimeout() {
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }
        }

        setVisualAnchor(point: VimPoint) {
            this.visualAnchorPoint = point;
            this.emitChange();
        }

        resetVisual() {
            this.visualAnchorPoint = null;
            this.emitChange();
        }

        setCursorColumn(col: number | null) {
            this.cursorColumn = col;
            this.emitChange();
        }

        setRegister(text: string) {
            this.unnamedReg = text;
            this.emitChange();
        }

        getRegister(): string {
            return this.unnamedReg;
        }
    }

    return new VimStoreClass(FluxDispatcher);
});
