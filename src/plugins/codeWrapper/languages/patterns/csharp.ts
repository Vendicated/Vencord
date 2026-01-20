/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const csharp: LanguagePattern = {
    name: "C#",
    identifier: "cs",
    extensions: [".cs"],
    threshold: 3,
    patterns: [
        { pattern: /\busing\s+[\w.]+;/, weight: 2, description: "using statement" },
        { pattern: /\bnamespace\s+[\w.]+/, weight: 2, description: "namespace declaration" },
        { pattern: /\b(public|private|protected|internal)\s+(static\s+)?(class|struct|interface|enum|record)\s+\w+/, weight: 3, description: "type declaration" },
        { pattern: /\b(public|private|protected|internal)\s+(static\s+)?(async\s+)?(void|Task|int|string|bool|float|double|decimal|var|dynamic)\s+\w+\s*\(/, weight: 2, description: "method declaration" },
        { pattern: /\bConsole\.(WriteLine|ReadLine|Write|Read)/, weight: 2, description: "Console methods" },
        { pattern: /\bSystem\.\w+/, weight: 1, description: "System namespace" },
        { pattern: /\bnew\s+\w+(<[\w,\s]+>)?\s*\(/, weight: 1, description: "new operator" },
        { pattern: /\bforeach\s*\([^)]+\s+in\s+/, weight: 2, description: "foreach loop" },
        { pattern: /\bget\s*[{;]|\bset\s*[{;]/, weight: 2, description: "property accessor" },
        { pattern: /\b(async|await)\s+/, weight: 1, description: "async/await" },
        { pattern: /\bTask(<[\w,\s]+>)?/, weight: 2, description: "Task type" },
        { pattern: /\b(IEnumerable|IList|IDictionary|ICollection)</, weight: 2, description: "collection interfaces" },
        { pattern: /\bList<\w+>/, weight: 2, description: "List generic" },
        { pattern: /\bDictionary<\w+,\s*\w+>/, weight: 2, description: "Dictionary generic" },
        { pattern: /\[[\w]+(\([^\)]*\))?\]/, weight: 1, description: "attributes" },
        { pattern: /=>\s*[{(]/, weight: 1, description: "lambda expression" },
        { pattern: /\bvar\s+\w+\s*=/, weight: 1, description: "var declaration" },
        { pattern: /\bstring\./, weight: 1, description: "string methods" },
        { pattern: /\bLINQ|\.Where\(|\.Select\(|\.OrderBy\(/, weight: 2, description: "LINQ" },
        { pattern: /\bpartial\s+(class|struct)/, weight: 2, description: "partial type" },
        { pattern: /\b(override|virtual|abstract)\s+/, weight: 1, description: "inheritance modifiers" },
        { pattern: /\bthrow\s+new\s+\w*Exception/, weight: 2, description: "throw exception" },
        { pattern: /\btry\s*{[\s\S]*}\s*catch\s*\(/, weight: 1, description: "try-catch" },
        // Unity specific
        { pattern: /\bMonoBehaviour|ScriptableObject/, weight: 3, description: "Unity base classes" },
        { pattern: /\bGetComponent<|AddComponent</, weight: 3, description: "Unity GetComponent" },
        { pattern: /\bTransform|GameObject|Vector3|Quaternion/, weight: 2, description: "Unity types" },
        { pattern: /\bStart\(\)|Update\(\)|Awake\(\)|FixedUpdate\(\)/, weight: 2, description: "Unity methods" },
        { pattern: /\[SerializeField\]|\[Header\(/, weight: 2, description: "Unity attributes" },
    ]
};
