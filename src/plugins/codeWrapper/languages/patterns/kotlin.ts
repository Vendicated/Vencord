/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const kotlin: LanguagePattern = {
    name: "Kotlin",
    identifier: "kt",
    extensions: [".kt", ".kts"],
    threshold: 3,
    patterns: [
        { pattern: /\bfun\s+\w+\s*(<[\w,\s]+>)?\s*\([^)]*\)(\s*:\s*\w+)?/, weight: 3, description: "function" },
        { pattern: /\bval\s+\w+\s*(:\s*\w+)?\s*=/, weight: 2, description: "val declaration" },
        { pattern: /\bvar\s+\w+\s*(:\s*\w+)?\s*=/, weight: 2, description: "var declaration" },
        { pattern: /\bclass\s+\w+(\s*<[\w,\s]+>)?(\s*\([^)]*\))?(\s*:\s*\w+)?/, weight: 2, description: "class" },
        { pattern: /\bdata\s+class\s+\w+/, weight: 3, description: "data class" },
        { pattern: /\bsealed\s+class\s+\w+/, weight: 3, description: "sealed class" },
        { pattern: /\bobject\s+\w+/, weight: 2, description: "object" },
        { pattern: /\bcompanion\s+object/, weight: 3, description: "companion object" },
        { pattern: /\bpackage\s+[\w.]+/, weight: 2, description: "package" },
        { pattern: /\bimport\s+[\w.*]+/, weight: 1, description: "import" },
        { pattern: /\bprintln\s*\(/, weight: 2, description: "println" },
        { pattern: /\bwhen\s*\([^)]*\)\s*{/, weight: 2, description: "when expression" },
        { pattern: /\bis\s+\w+|!is\s+\w+/, weight: 2, description: "type check" },
        { pattern: /\bas\??\s+\w+/, weight: 2, description: "type cast" },
        { pattern: /\b(Int|Long|Double|Float|Boolean|String|Char|Unit|Nothing)\b/, weight: 1, description: "Kotlin types" },
        { pattern: /\b(listOf|mapOf|setOf|mutableListOf)\s*\(/, weight: 2, description: "collection functions" },
        { pattern: /\bsuspend\s+fun/, weight: 3, description: "suspend function" },
        { pattern: /\blaunch\s*{|\basync\s*{/, weight: 2, description: "coroutines" },
        { pattern: /\blazy\s*{/, weight: 2, description: "lazy" },
        { pattern: /\binit\s*{/, weight: 2, description: "init block" },
        { pattern: /\bconstructor\s*\(/, weight: 2, description: "constructor" },
        { pattern: /\boverride\s+fun/, weight: 2, description: "override" },
        { pattern: /\b(public|private|protected|internal)\s+/, weight: 1, description: "visibility modifiers" },
        { pattern: /\?\.|!!\./, weight: 2, description: "null safety operators" },
        { pattern: /\?\s*:/, weight: 2, description: "elvis operator" },
        { pattern: /::class|::|\w+::/, weight: 2, description: "reflection" },
        { pattern: /\blet\s*{|\balso\s*{|\brun\s*{|\bapply\s*{/, weight: 2, description: "scope functions" },
    ]
};
