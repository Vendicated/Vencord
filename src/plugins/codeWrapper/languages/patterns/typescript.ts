/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const typescript: LanguagePattern = {
    name: "TypeScript",
    identifier: "ts",
    extensions: [".ts", ".tsx", ".mts", ".cts"],
    threshold: 3,
    patterns: [
        // TypeScript specific (higher weight)
        { pattern: /:\s*(string|number|boolean|any|void|never|unknown|object)\b/, weight: 3, description: "type annotation" },
        { pattern: /:\s*\w+(\[\])?(\s*\|\s*\w+(\[\])?)*\s*(=|;|,|\))/, weight: 2, description: "type annotation with union" },
        { pattern: /\binterface\s+\w+/, weight: 4, description: "interface declaration" },
        { pattern: /\btype\s+\w+\s*=/, weight: 4, description: "type alias" },
        { pattern: /<\w+(\s*,\s*\w+)*>/, weight: 2, description: "generic type" },
        { pattern: /\bas\s+\w+/, weight: 2, description: "type assertion" },
        { pattern: /\benum\s+\w+\s*{/, weight: 3, description: "enum declaration" },
        { pattern: /\b(readonly|private|public|protected)\s+\w+:/, weight: 2, description: "access modifiers with type" },
        { pattern: /\bkeyof\s+\w+/, weight: 3, description: "keyof operator" },
        { pattern: /\btypeof\s+\w+/, weight: 1, description: "typeof operator" },
        { pattern: /\bPick<|Omit<|Partial<|Required<|Record</, weight: 3, description: "utility types" },
        { pattern: /\bPromise<[\w\s|<>,]+>/, weight: 2, description: "Promise type" },
        { pattern: /\bArray<[\w\s|<>,]+>/, weight: 1, description: "Array type" },
        { pattern: /\bimport\s+type\s+/, weight: 4, description: "type import" },
        { pattern: /\bexport\s+type\s+/, weight: 4, description: "type export" },
        { pattern: /\w+\s*\?\s*:/, weight: 2, description: "optional property" },
        { pattern: /!\s*\.|\!\s*\[/, weight: 2, description: "non-null assertion" },
        { pattern: /\bdeclare\s+(const|let|var|function|class|module|namespace)/, weight: 4, description: "declare statement" },
        { pattern: /\bnamespace\s+\w+/, weight: 3, description: "namespace" },
        { pattern: /\bimplements\s+\w+/, weight: 3, description: "implements" },
        { pattern: /\babstract\s+(class|method)/, weight: 3, description: "abstract" },
        // Also includes JavaScript patterns but with lower weight
        { pattern: /\b(const|let|var)\s+\w+\s*=/, weight: 0.5, description: "variable declaration" },
        { pattern: /\bfunction\s+\w*\s*\(/, weight: 1, description: "function declaration" },
        { pattern: /=>\s*[{(]/, weight: 0.5, description: "arrow function" },
        { pattern: /\bconsole\.(log|error|warn|info)\(/, weight: 1, description: "console methods" },
        { pattern: /\b(import|export)\s+/, weight: 1, description: "ES modules" },
    ]
};
