/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const go: LanguagePattern = {
    name: "Go",
    identifier: "go",
    extensions: [".go"],
    threshold: 3,
    patterns: [
        { pattern: /\bpackage\s+\w+/, weight: 3, description: "package declaration" },
        { pattern: /\bimport\s+(\([\s\S]*?\)|\"\w+\")/, weight: 2, description: "import" },
        { pattern: /\bfunc\s+(\([^)]+\)\s*)?\w+\s*\([^)]*\)\s*(\([^)]*\)|[\w*]+)?/, weight: 3, description: "function" },
        { pattern: /\bfmt\.(Println|Printf|Print|Sprintf|Errorf)/, weight: 3, description: "fmt package" },
        { pattern: /\btype\s+\w+\s+(struct|interface)\s*{/, weight: 3, description: "type definition" },
        { pattern: /\bfunc\s*\(\w+\s+\*?\w+\)/, weight: 3, description: "method receiver" },
        { pattern: /\b(chan|go|defer|select)\s+/, weight: 3, description: "concurrency keywords" },
        { pattern: /\bmake\s*\((chan|map|\[\])/, weight: 2, description: "make function" },
        { pattern: /\bappend\s*\(\w+,/, weight: 2, description: "append" },
        { pattern: /:=/, weight: 2, description: "short declaration" },
        { pattern: /\b(string|int|int32|int64|float32|float64|bool|byte|rune|error)\b/, weight: 1, description: "Go types" },
        { pattern: /\bstruct\s*{/, weight: 2, description: "anonymous struct" },
        { pattern: /\binterface\s*{/, weight: 2, description: "interface" },
        { pattern: /\bmap\[\w+\]\w+/, weight: 2, description: "map type" },
        { pattern: /\[\]\w+/, weight: 1, description: "slice type" },
        { pattern: /\bif\s+\w+\s*:=/, weight: 2, description: "if with assignment" },
        { pattern: /\bfor\s+\w+\s*:=\s*range/, weight: 2, description: "for range" },
        { pattern: /\bswitch\s+\w*\s*{/, weight: 1, description: "switch" },
        { pattern: /\bcase\s+[\w"]+:/, weight: 1, description: "case" },
        { pattern: /\bgoto\s+\w+/, weight: 2, description: "goto" },
        { pattern: /\bnil\b/, weight: 2, description: "nil" },
        { pattern: /\b_\s*=/, weight: 1, description: "blank identifier" },
        { pattern: /\berror\s*\)|\bError\(\)/, weight: 2, description: "error handling" },
        { pattern: /\bpanic\s*\(|\brecover\s*\(/, weight: 2, description: "panic/recover" },
    ]
};
