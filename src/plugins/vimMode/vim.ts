/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Commands, Keymap } from "./commands";
import { Mode } from "./modes";

export class VimEngine {
    private mode: Mode = Mode.NORMAL;
    private buffer: string = "";
    private chordTimer: any = null;
    private styleElement: HTMLStyleElement | null = null;
    private overlayElement: HTMLDivElement | null = null;

    constructor() {
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    public start() {
        this.injectStyles();
        this.createOverlay();
        window.addEventListener("keydown", this.handleKeyDown, { capture: true });
    }

    public stop() {
        window.removeEventListener("keydown", this.handleKeyDown, { capture: true });
        this.styleElement?.remove();
        this.overlayElement?.remove();
    }

    private switchMode(newMode: Mode) {
        this.mode = newMode;
        this.clearBuffer();

        if (newMode === Mode.INSERT) {
            this.overlayElement?.classList.add("vim-overlay-insert");
        } else if (newMode === Mode.NORMAL) {
            Commands.blurEditor();
            this.overlayElement?.classList.remove("vim-overlay-insert");
        }

        this.updateOverlay();
    }

    private clearBuffer() {
        this.buffer = "";
        if (this.chordTimer) clearTimeout(this.chordTimer);
        this.chordTimer = null;
    }

    private handleKeyDown(e: KeyboardEvent) {
        if (!e.isTrusted) return; // pass through native events simulated via commands

        if (e.key === "Escape") {
            this.switchMode(Mode.NORMAL);
            return;
        }

        if (this.mode === Mode.INSERT) return;

        if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) {
            return;
        }

        // Normal Mode Logic
        e.stopImmediatePropagation();
        e.preventDefault();

        const { key } = e;

        // 1. Check if we have a pending chord buffer (e.g. user typed 'g')
        if (this.buffer) {
            this.handleChord(key);
            return;
        }

        // 2. Check if this key STARTS a chord (like 'g')
        if (["g"].includes(key)) {
            this.buffer = key;
            this.updateOverlay();

            // Auto-clear buffer if too slow (1.5s)
            this.chordTimer = setTimeout(() => {
                this.clearBuffer();
                this.updateOverlay();
            }, 1500);
            return;
        }

        // 3. Handle Single keys
        const actionName = Keymap[key];
        if (actionName && Commands[actionName]) {
            const nextMode = Commands[actionName]();
            if (nextMode) {
                this.switchMode(nextMode);
            }
        }
    }

    private handleChord(key: string) {
        const fullChord = this.buffer + key;
        switch (fullChord) {
            case "gg":
                Commands.scrollToTop();
                break;
            case "go":
                Commands.openQuickSwitcher();
                this.switchMode(Mode.INSERT);
                break;
            case "gt":
                Commands.nextServer();
                break;
            case "gT":
                Commands.prevServer();
                break;
            default:
                console.log(`Unknown chord: ${fullChord}`);
        }
        this.clearBuffer();
        this.updateOverlay();
    }

    // UI helpers
    private injectStyles() {
        this.styleElement = document.createElement("style");
        this.styleElement.textContent = `
            .vim-overlay {
                position: fixed;
                bottom: 10px;
                right: 10px;
                background: #5865F2;
                backdrop-filter: blur(8px);
                color: #FFFFFF;
                padding: 6px 12px;
                border-radius: 6px;
                z-index: 9999;
                font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
                font-size: 13px;
                border: 1px solid #4752C4;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                pointer-events: none;
                letter-spacing: 0.5px;
                font-weight: 600;
            }

            .vim-overlay-insert{
                background: #FF8C42 !important;
                border-color: #CC6C30 !important;
            }
        `;
        document.head.appendChild(this.styleElement);
    }

    private createOverlay() {
        this.overlayElement = document.createElement("div");
        this.overlayElement.className = "vim-overlay";
        this.updateOverlay();
        document.body.appendChild(this.overlayElement);
    }

    private updateOverlay() {
        if (this.overlayElement) {
            this.overlayElement.innerText = `${this.mode} ${this.buffer ? `(${this.buffer})` : ""}`;
            this.overlayElement.style.display = "block";
        }
    }
}
