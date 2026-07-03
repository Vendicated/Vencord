/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { insertTextIntoChatInputBox } from "@utils/discord";

import { canSmartPaste, detectSmartPasteLanguage, wrapSmartPaste } from "./languageDetector";
import { openSmartPastePrompt } from "./promptModal";
import { settings, SmartPasteLanguage } from "./settings";

function isMessageEditorTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;

    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return true;

    return (target as HTMLElement).isContentEditable || Boolean(target.closest('[contenteditable="true"]'));
}

function isPlainTextPaste(event: ClipboardEvent) {
    const data = event.clipboardData;
    if (!data) return false;

    if (!data.types.includes("text/plain")) return false;

    return Array.from(data.items).every(item => item.kind !== "file");
}

function isAlreadyCodeBlock(text: string) {
    return /^\s*```/.test(text);
}

function insertWrappedText(text: string, language: SmartPasteLanguage) {
    insertTextIntoChatInputBox(wrapSmartPaste(text, language));
}

export function handleSmartPaste(event: ClipboardEvent) {
    if (!settings.store.enabled) return;
    if (event.defaultPrevented) return;
    if (!isMessageEditorTarget(event.target)) return;
    if (!isPlainTextPaste(event)) return;

    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (!text || isAlreadyCodeBlock(text)) return;

    const normalized = text.replace(/\r\n?/g, "\n");
    if (!canSmartPaste(normalized, settings.store.minimumLines, settings.store.minimumCharacters, settings.store.ignoreSingleLineSnippets)) return;

    const detection = settings.store.autoDetectLanguage
        ? detectSmartPasteLanguage(normalized)
        : null;

    const wantsPrompt = settings.store.askBeforeWrapping
        || (!settings.store.alwaysUsePlaintext && settings.store.autoDetectLanguage && !detection?.language);

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (wantsPrompt) {
        const defaultLanguage = settings.store.lastLanguageChoice
            ?? detection?.language
            ?? "plaintext";

        openSmartPastePrompt(
            detection?.language
                ? `Detected ${detection.language === "plaintext" ? "plain text" : detection.language} in the pasted content.`
                : "The pasted text looks like code, but the language is uncertain.",
            settings.store.alwaysUsePlaintext ? "plaintext" : defaultLanguage,
            choice => {
                if (!choice) return;

                settings.store.lastLanguageChoice = choice;
                insertWrappedText(normalized, choice);
            }
        );
        return;
    }

    const language: SmartPasteLanguage = settings.store.alwaysUsePlaintext
        ? "plaintext"
        : settings.store.autoDetectLanguage && detection?.language
            ? detection.language
            : settings.store.lastLanguageChoice ?? "plaintext";

    settings.store.lastLanguageChoice = language;
    insertWrappedText(normalized, language);
}
