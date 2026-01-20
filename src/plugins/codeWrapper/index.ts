/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ComponentDispatch } from "@webpack/common";

import { getSupportedLanguages } from "./utils/detector";
import { detectLanguage, isAlreadyCodeBlock, wrapWithCodeBlock } from "./utils/detector";

export const settings = definePluginSettings({
    autoDetect: {
        description: "코드 자동 감지 및 래핑 활성화",
        type: OptionType.BOOLEAN,
        default: true
    },
    fallbackLanguage: {
        description: "언어 감지 실패 시 기본 언어 (예: txt, cs, js)",
        type: OptionType.STRING,
        default: "txt"
    },
    shortcutKey: {
        description: "코드 블록 래핑 단축키",
        type: OptionType.STRING,
        default: "ctrl+shift+c"
    },
    minLines: {
        description: "자동 감지 최소 줄 수",
        type: OptionType.NUMBER,
        default: 3
    },
    showNotification: {
        description: "코드 감지 시 알림 표시",
        type: OptionType.BOOLEAN,
        default: false
    }
});

// 현재 메시지 입력창의 텍스트 가져오기
function getSlateEditor(): Element | null {
    return document.querySelector("[data-slate-editor='true']");
}

export default definePlugin({
    name: "CodeWrapper",
    description: "코드를 자동으로 감지하여 코드블록으로 감싸거나, 단축키로 코드블록 래핑. 20+ 프로그래밍 언어 지원!",
    authors: [Devs.Ven], // 실제 사용 시 자신의 정보로 변경
    settings,

    // 지원되는 언어 목록 표시
    getSupportedLanguagesList(): string {
        return getSupportedLanguages()
            .map(lang => `${lang.name} (${lang.identifier})`)
            .join(", ");
    },

    // 메시지 전송 전 처리
    onBeforeMessageSend(_, msg) {
        if (!settings.store.autoDetect) return;

        const { content } = msg;
        const lineCount = content.split("\n").length;

        // 최소 줄 수 체크
        if (lineCount < settings.store.minLines) return;

        // 이미 코드블록이면 무시
        if (isAlreadyCodeBlock(content)) return;

        // 언어 감지
        const result = detectLanguage(content);

        if (result.isCode && result.language) {
            msg.content = wrapWithCodeBlock(content, result.language.identifier);

            if (settings.store.showNotification) {
                console.log(`[CodeWrapper] Detected ${result.language.name} code (score: ${result.score})`);
            }
        }
    },

    onBeforeMessageEdit(_cid, _mid, msg) {
        if (!settings.store.autoDetect) return;

        const { content } = msg;
        const lineCount = content.split("\n").length;

        if (lineCount < settings.store.minLines) return;
        if (isAlreadyCodeBlock(content)) return;

        const result = detectLanguage(content);

        if (result.isCode && result.language) {
            msg.content = wrapWithCodeBlock(content, result.language.identifier);
        }
    },

    // 단축키 핸들러
    handleKeyDown(e: KeyboardEvent) {
        const shortcut = settings.store.shortcutKey.toLowerCase();
        const parts = shortcut.split("+");

        const needsCtrl = parts.includes("ctrl");
        const needsShift = parts.includes("shift");
        const needsAlt = parts.includes("alt");
        const key = parts.find(p => !["ctrl", "shift", "alt"].includes(p))?.toUpperCase();

        if (
            needsCtrl === e.ctrlKey &&
            needsShift === e.shiftKey &&
            needsAlt === e.altKey &&
            e.key.toUpperCase() === key
        ) {
            e.preventDefault();
            this.wrapCurrentText();
        }
    },

    // 현재 입력창 텍스트를 코드블록으로 감싸기
    wrapCurrentText() {
        const slateNode = getSlateEditor();
        if (!slateNode) return;

        const currentText = slateNode.textContent || "";
        if (!currentText.trim()) return;

        // 이미 코드블록이면 무시
        if (isAlreadyCodeBlock(currentText)) return;

        // 언어 감지 시도
        const result = detectLanguage(currentText);
        const language = result.language?.identifier || settings.store.fallbackLanguage;

        const wrappedText = wrapWithCodeBlock(currentText.trim(), language);

        // 입력창 비우기
        ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", {
            rawText: "",
            plainText: ""
        });

        // 새 텍스트 삽입 (약간의 딜레이 후)
        setTimeout(() => {
            ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", {
                rawText: wrappedText,
                plainText: wrappedText
            });
        }, 10);
    },

    start() {
        // 키보드 이벤트 리스너 등록
        this.keyHandler = this.handleKeyDown.bind(this);
        document.addEventListener("keydown", this.keyHandler);

        console.log("[CodeWrapper] Started! Supported languages:", this.getSupportedLanguagesList());
    },

    stop() {
        // 키보드 이벤트 리스너 해제
        if (this.keyHandler) {
            document.removeEventListener("keydown", this.keyHandler);
        }
    },

    keyHandler: null as ((e: KeyboardEvent) => void) | null
});
