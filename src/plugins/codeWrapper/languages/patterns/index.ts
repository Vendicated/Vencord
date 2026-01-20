/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

import { bash } from "./bash";
import { c } from "./c";
import { cpp } from "./cpp";
import { csharp } from "./csharp";
import { css } from "./css";
import { go } from "./go";
import { html } from "./html";
import { java } from "./java";
import { javascript } from "./javascript";
import { json } from "./json";
import { kotlin } from "./kotlin";
import { lua } from "./lua";
import { php } from "./php";
import { python } from "./python";
import { ruby } from "./ruby";
import { rust } from "./rust";
import { sql } from "./sql";
import { swift } from "./swift";
import { typescript } from "./typescript";
import { yaml } from "./yaml";

// 모든 지원 언어 패턴 (우선순위 순서대로)
const languagePatterns: LanguagePattern[] = [
    // 특정 언어 패턴이 명확한 것들 먼저
    typescript,  // JS보다 먼저 검사 (TS는 JS의 상위집합)
    csharp,
    java,
    kotlin,
    swift,
    rust,
    go,
    cpp,
    c,
    python,
    ruby,
    php,
    javascript,
    html,
    css,
    sql,
    bash,
    lua,
    json,
    yaml,
];

export default languagePatterns;

// 개별 언어 내보내기
export {
    bash,
    c,
    cpp,
    csharp,
    css,
    go,
    html,
    java,
    javascript,
    json,
    kotlin,
    lua,
    php,
    python,
    ruby,
    rust,
    sql,
    swift,
    typescript,
    yaml
};
