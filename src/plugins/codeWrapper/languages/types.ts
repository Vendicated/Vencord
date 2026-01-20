/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface LanguagePattern {
    /** 언어 이름 (사람이 읽을 수 있는 형태) */
    name: string;
    /** 코드블록 언어 식별자 (예: cs, js, py) */
    identifier: string;
    /** 파일 확장자 */
    extensions: string[];
    /** 코드 감지용 정규식 패턴들 - 가중치 포함 */
    patterns: PatternWithWeight[];
    /** 감지 임계값 (기본값: 3) - 이 점수 이상이면 해당 언어로 인식 */
    threshold?: number;
}

export interface PatternWithWeight {
    /** 정규식 패턴 */
    pattern: RegExp;
    /** 가중치 (기본값: 1) - 해당 패턴이 얼마나 중요한지 */
    weight?: number;
    /** 패턴 설명 (디버깅용) */
    description?: string;
}

/** 언어 감지 결과 */
export interface DetectionResult {
    /** 감지된 언어 (없으면 null) */
    language: LanguagePattern | null;
    /** 감지 점수 */
    score: number;
    /** 코드 여부 */
    isCode: boolean;
}
