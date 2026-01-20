/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs, IS_MAC } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ComponentDispatch } from "@webpack/common";

import { isAlreadyCodeBlock, wrapWithCodeBlock } from "./utils/detector";

export const settings = definePluginSettings({
    language: {
        description: "제일 자주 보내는 코드 언어를 선택하세요 (예: py, js, cpp)",
        type: OptionType.STRING,
        default: "py"
    },
    shortcutKey: {
        description: "코드 블록 래핑 단축키",
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

// 에디터 내용 추출 (줄바꿈 보존 및 이모지 개행 문제 해결)
function getEditorContent(editor: Element): string {
    // 에디터 내부의 각 줄(보통 div 또는 p)을 순회합니다.
    const lines = Array.from(editor.children);

    if (lines.length > 0) {
        return lines.map(line => {
            // textContent는 이모지나 태그 때문에 발생하는 불필요한 레이아웃 줄바꿈을 무시합니다.
            // Slate 에디터에서 사용하는 제로 너비 공백(\u200b) 등을 제거합니다.
            return (line.textContent || "").replace(/[\u200b\ufeff]/g, "");
        }).join("\n");
    }

    // fallback: 자식이 없는 경우
    return (editor as HTMLElement).innerText.replace(/\r/g, "");
}

export default definePlugin({
    name: "CodeWrapper",
    description: "단축키로 코드를 안전하게 코드블록으로 감쌉니다.",
    authors: [Devs.cbite],
    settings,

    handleKeyDown(e: KeyboardEvent) {
        const shortcut = settings.store.shortcutKey.toLowerCase();
        const parts = shortcut.split("+");

        const needsShift = parts.includes("shift");
        const needsAlt = parts.includes("alt");
        const needsCtrl = parts.includes("ctrl") || parts.includes("control");
        const needsCmd = parts.includes("cmd") || parts.includes("command") || parts.includes("meta");

        // OS별 모디파이어 키 매칭
        // Mac: 'ctrl' 설정이나 'cmd' 설정 모두 Command(Meta) 키로 감지
        // Windows/Linux: 'ctrl' 설정은 Control 키로 감지
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
        if (!rawText.trim()) return;

        // 이미 완료된 코드블록이면 실행 안 함
        if (isAlreadyCodeBlock(rawText)) return;

        let { language } = settings.store;
        let codeContent = rawText;

        // 수동 언어 감지
        const lines = rawText.split("\n");
        if (lines.length > 1) {
            const firstLine = lines[0].trim();
            if (firstLine.length > 0 && firstLine.length < 15 && /^[a-zA-Z0-9+\-#]+$/.test(firstLine)) {
                language = firstLine;
                codeContent = lines.slice(1).join("\n").trim();
            }
        }

        const wrappedText = wrapWithCodeBlock(codeContent, language);

        // --- 가장 안전한 교체 로직 ---
        const editor = slateNode as HTMLElement;
        editor.focus();

        // 1. 전체 선택 (브라우저 명령어 중 Slate가 가장 잘 인식하는 것 하나만 사용)
        document.execCommand("selectAll", false, undefined);

        // 2. 디스코드가 선택 영역을 인식할 시간을 짧게 줍니다 (중요)
        setTimeout(() => {
            // 3. 내부 Dispatch를 사용하여 텍스트 삽입 (높이 자동 조절 및 마크다운 처리)
            // 선택된 영역이 있는 상태에서 실행하면 '덮어쓰기'가 확실하게 일어납니다.
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
