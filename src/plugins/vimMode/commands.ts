/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Mode } from "./modes";
import { getChatScroller, getEditor, getSearchBar } from "./utils";

type CommandHandler = () => void | Mode;

const safeScroll = (callback: (scroller: HTMLElement) => void) => {
    const scroller = getChatScroller();
    if (scroller) {
        callback(scroller);
    } else {
        console.warn("[vimMode] Scroller not found! Check utils.ts selectors.");
    }
};

const simulateKey = (key: string, modifiers: { alt?: boolean, ctrl?: boolean, shift?: boolean; } = {}) => {
    const keyMap: Record<string, { code: string, keyCode: number; }> = {
        "ArrowDown": { code: "ArrowDown", keyCode: 40 },
        "ArrowUp": { code: "ArrowUp", keyCode: 38 },
        "k": { code: "KeyK", keyCode: 75 },
        "j": { code: "KeyJ", keyCode: 74 }
    };

    const meta = keyMap[key] || { code: undefined, keyCode: 0 };

    const eventOpts = {
        key: key,
        code: meta.code,
        keyCode: meta.keyCode,
        which: meta.keyCode,
        altKey: modifiers.alt || false,
        ctrlKey: modifiers.ctrl || false,
        shiftKey: modifiers.shift || false,
        metaKey: false,
        bubbles: true,
        cancelable: true
    };

    const event = new KeyboardEvent("keydown", eventOpts);

    if (meta.keyCode) {
        Object.defineProperty(event, "keyCode", { get: () => meta.keyCode });
        Object.defineProperty(event, "which", { get: () => meta.keyCode });
    }

    (document.activeElement || document.body).dispatchEvent(event);
};

export const Commands: Record<string, CommandHandler> = {
    // --- Scrolling ---
    scrollDown: () => safeScroll(s => s.scrollBy({ top: 50, behavior: "smooth" })),
    scrollUp: () => safeScroll(s => s.scrollBy({ top: -50, behavior: "smooth" })),
    scrollToBottom: () => safeScroll(s => s.scrollTo({ top: s.scrollHeight, behavior: "auto" })),
    scrollToTop: () => safeScroll(s => s.scrollTo({ top: 0, behavior: "auto" })),

    // --- Editor ---
    focusEditor: () => {
        const editor = getEditor();
        if (editor) {
            editor.focus();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
        return Mode.INSERT;
    },
    blurEditor: () => {
        getEditor()?.blur();
    },

    // --- Discord Native Navigation ---
    nextChannel: () => simulateKey("ArrowDown", { alt: true }),
    prevChannel: () => simulateKey("ArrowUp", { alt: true }),
    nextServer: () => simulateKey("ArrowDown", { ctrl: true, alt: true }),
    prevServer: () => simulateKey("ArrowUp", { ctrl: true, alt: true }),

    openQuickSwitcher: () => {
        simulateKey("k", { ctrl: true });
        return Mode.INSERT;
    },

    focusSearch: () => {
        const search = getSearchBar();
        if (search) {
            search.click();
            search.focus();
        }
        return Mode.INSERT;
    }
};

export const Keymap: Record<string, keyof typeof Commands> = {
    "j": "scrollDown",
    "k": "scrollUp",
    "G": "scrollToBottom",
    "i": "focusEditor",
    "J": "nextChannel",
    "K": "prevChannel",
    "/": "focusSearch",
};
