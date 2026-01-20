/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * 이미 코드블록으로 감싸져 있는지 확인합니다.
 * 마크다운 백틱(```)만 감지하고, Python 삼중 따옴표(""")는 무시합니다.
 */
export function isAlreadyCodeBlock(content: string): boolean {
    const trimmed = content.trim();
    // 백틱(`)으로 시작하고 끝나는지 확인
    return /^`{3}[\s\S]*`{3}$/m.test(trimmed);
}

/**
 * 코드블록으로 감쌉니다.
 * @param content 감쌀 내용
 * @param language 언어 식별자 (예: cs, js, py)
 */
export function wrapWithCodeBlock(content: string, language: string): string {
    // 내용물에 포함된 백틱 중 가장 긴 길이를 찾습니다.
    const backticks = content.match(/`+/g);
    let maxLength = 0;

    if (backticks) {
        maxLength = Math.max(...backticks.map(t => t.length));
    }

    // 기본은 3개, 내부에 백틱이 포함되어 있으면 그보다 1개 더 많게 설정하여 끊김 방지
    const fenceLength = Math.max(3, maxLength + 1);
    const fence = "`".repeat(fenceLength);

    return `${fence}${language}\n${content.trim()}\n${fence}`;
}
