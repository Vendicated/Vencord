/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs, IS_MAC } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ComponentDispatch } from "@webpack/common";

import { isAlreadyCodeBlock, wrapWithCodeBlock } from "./utils/detector";

const isKo = navigator.language.startsWith("ko");

export const settings = definePluginSettings({
    language: {
        description: isKo
            ? "제일 자주 보내는 코드 언어를 선택하세요 (예: py, js, cpp)"
            : "Select the code language you send most often (e.g. py, js, cpp)",
        type: OptionType.STRING,
        default: "py"
    },
    shortcutKey: {
        description: isKo
            ? "코드 블록 래핑 단축키"
            : "Code block wrapping shortcut",
        type: OptionType.STRING,
        default: "ctrl+shift+c"
    }
});

function getSlateEditor(): Element | null {
    const editor = document.querySelector("[data-slate-editor='true']");
    if (editor) return editor;
    const active = document.activeElement;
    if (active && (active.getAttribute("contenteditable") === "true" || active.getAttribute("role") === "textbox")) {
        return active;
    }
    return null;
}

function getEditorContent(editor: Element): string {
    const lines = Array.from(editor.children);
    if (lines.length > 0) {
        return lines.map(line => (line.textContent || "").replace(/[\u200b\ufeff]/g, "")).join("\n");
    }
    return (editor as HTMLElement).innerText.replace(/\r/g, "");
}

export default definePlugin({
    name: "CodeWrapper",
    description: isKo
        ? "단축키로 코드를 안전하게 코드블록으로 감쌉니다."
        : "Safely wrap code into code blocks using a shortcut.",
    authors: [Devs.cbite],
    settings,

    handleKeyDown(e: KeyboardEvent) {
        const shortcut = settings.store.shortcutKey.toLowerCase();
        const parts = shortcut.split("+");
        const needsShift = parts.includes("shift");
        const needsAlt = parts.includes("alt");
        const needsCtrl = parts.includes("ctrl") || parts.includes("control");
        const needsCmd = parts.includes("cmd") || parts.includes("command") || parts.includes("meta");
        const modifierMatch = IS_MAC
            ? ((needsCtrl || needsCmd) ? e.metaKey : !e.metaKey)
            : (needsCtrl ? e.ctrlKey : !e.ctrlKey);
        const shiftMatch = (needsShift === e.shiftKey);
        const altMatch = (needsAlt === e.altKey);
        const key = parts.find(p => !["ctrl", "control", "shift", "alt", "cmd", "command", "meta"].includes(p))?.toUpperCase();
        const keyMatch = (e.key.toUpperCase() === key);

        if (modifierMatch && shiftMatch && altMatch && keyMatch) {
            e.preventDefault();
            this.wrapCurrentText();
        }
    },

    wrapCurrentText() {
        const slateNode = getSlateEditor();
        if (!slateNode) return;
        const rawText = getEditorContent(slateNode);
        if (!rawText.trim() || isAlreadyCodeBlock(rawText)) return;

        let { language } = settings.store;
        let codeContent = rawText;
        const lines = rawText.split("\n");
        if (lines.length > 1) {
            const firstLine = lines[0].trim();
            if (firstLine.length > 0 && firstLine.length < 15 && /^[a-zA-Z0-9+\-#]+$/.test(firstLine)) {
                language = firstLine;
                codeContent = lines.slice(1).join("\n").trim();
            }
        }

        const wrappedText = wrapWithCodeBlock(codeContent, language);
        const editor = slateNode as HTMLElement;
        editor.focus();
        document.execCommand("selectAll", false, undefined);
        setTimeout(() => {
            ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", {
                rawText: wrappedText,
                plainText: wrappedText
            });
        }, 100);
    },

    start() {
        this.keyHandler = this.handleKeyDown.bind(this);
        document.addEventListener("keydown", this.keyHandler, true);
    },

    stop() {
        if (this.keyHandler) {
            document.removeEventListener("keydown", this.keyHandler, true);
        }
    },

    keyHandler: null as ((e: KeyboardEvent) => void) | null
});
