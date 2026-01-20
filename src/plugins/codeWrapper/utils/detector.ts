/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import languagePatterns from "../languages/patterns";
import type { DetectionResult, LanguagePattern } from "../languages/types";

/**
 * 코드 내용에서 언어를 감지합니다.
 * @param content 분석할 코드 내용
 * @returns 감지 결과 (언어, 점수, 코드 여부)
 */
export function detectLanguage(content: string): DetectionResult {
    // 빈 내용은 무시
    if (!content.trim()) {
        return { language: null, score: 0, isCode: false };
    }

    // 이미 코드블록으로 감싸져 있으면 무시
    if (isAlreadyCodeBlock(content)) {
        return { language: null, score: 0, isCode: false };
    }

    let bestMatch: LanguagePattern | null = null;
    let bestScore = 0;

    // 각 언어 패턴을 검사
    for (const lang of languagePatterns) {
        const score = calculateScore(content, lang);
        const threshold = lang.threshold ?? 3;

        if (score >= threshold && score > bestScore) {
            bestScore = score;
            bestMatch = lang;
        }
    }

    return {
        language: bestMatch,
        score: bestScore,
        isCode: bestMatch !== null
    };
}

/**
 * 주어진 언어 패턴에 대한 점수를 계산합니다.
 */
function calculateScore(content: string, lang: LanguagePattern): number {
    let score = 0;

    for (const { pattern, weight = 1 } of lang.patterns) {
        if (pattern.test(content)) {
            score += weight;
        }
    }

    return score;
}

/**
 * 이미 코드블록으로 감싸져 있는지 확인합니다.
 */
export function isAlreadyCodeBlock(content: string): boolean {
    const trimmed = content.trim();
    return /^```[\s\S]*```$/m.test(trimmed);
}

/**
 * 코드블록으로 감쌉니다.
 * @param content 감쌀 내용
 * @param language 언어 식별자 (예: cs, js, py)
 */
export function wrapWithCodeBlock(content: string, language: string): string {
    // 이미 코드블록이면 그대로 반환
    if (isAlreadyCodeBlock(content)) return content;

    return `\`\`\`${language}\n${content.trim()}\n\`\`\``;
}

/**
 * 특정 언어 식별자가 지원되는지 확인합니다.
 */
export function isLanguageSupported(identifier: string): boolean {
    return languagePatterns.some(lang => lang.identifier === identifier);
}

/**
 * 지원되는 모든 언어 목록을 반환합니다.
 */
export function getSupportedLanguages(): LanguagePattern[] {
    return [...languagePatterns];
}

/**
 * 언어 식별자로 언어 패턴을 가져옵니다.
 */
export function getLanguageByIdentifier(identifier: string): LanguagePattern | undefined {
    return languagePatterns.find(lang => lang.identifier === identifier);
}
