/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const java: LanguagePattern = {
    name: "Java",
    identifier: "java",
    extensions: [".java"],
    threshold: 3,
    patterns: [
        { pattern: /\bpublic\s+class\s+\w+/, weight: 3, description: "public class" },
        { pattern: /\b(public|private|protected)\s+(static\s+)?(final\s+)?\w+\s+\w+\s*\(/, weight: 2, description: "method declaration" },
        { pattern: /\bimport\s+[\w.]+\*?;/, weight: 2, description: "import statement" },
        { pattern: /\bpackage\s+[\w.]+;/, weight: 3, description: "package declaration" },
        { pattern: /\bSystem\.(out|err)\.(println|print)/, weight: 3, description: "System.out" },
        { pattern: /\bpublic\s+static\s+void\s+main\s*\(/, weight: 4, description: "main method" },
        { pattern: /\b(int|long|double|float|boolean|char|byte|short|void)\s+\w+/, weight: 1, description: "primitive types" },
        { pattern: /\bString\s+\w+/, weight: 1, description: "String type" },
        { pattern: /\bnew\s+\w+(<[\w,\s<>]+>)?\s*\(/, weight: 1, description: "new operator" },
        { pattern: /\bextends\s+\w+|\bimplements\s+\w+/, weight: 2, description: "inheritance" },
        { pattern: /\b(ArrayList|HashMap|LinkedList|HashSet)</, weight: 2, description: "collections" },
        { pattern: /\bthrows\s+\w+Exception/, weight: 2, description: "throws clause" },
        { pattern: /\b@Override|\b@Deprecated|\b@SuppressWarnings/, weight: 3, description: "annotations" },
        { pattern: /\binterface\s+\w+/, weight: 2, description: "interface" },
        { pattern: /\benum\s+\w+\s*{/, weight: 2, description: "enum" },
        { pattern: /\b(final|static|abstract|synchronized)\s+/, weight: 1, description: "modifiers" },
        { pattern: /\binstanceof\s+\w+/, weight: 2, description: "instanceof" },
        { pattern: /\bsuper\.\w+|\bthis\.\w+/, weight: 1, description: "super/this" },
        { pattern: /\btry\s*{[\s\S]*}\s*catch\s*\(\w+Exception/, weight: 2, description: "try-catch" },
        { pattern: /\.stream\(\)\.|\.collect\(|\.filter\(|\.map\(/, weight: 2, description: "streams" },
        { pattern: /\bOptional<\w+>/, weight: 2, description: "Optional" },
        { pattern: /\b@Autowired|\b@Component|\b@Service|\b@Repository/, weight: 3, description: "Spring annotations" },
    ]
};
