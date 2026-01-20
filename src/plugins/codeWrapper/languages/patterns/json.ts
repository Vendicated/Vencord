/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const json: LanguagePattern = {
    name: "JSON",
    identifier: "json",
    extensions: [".json", ".jsonc"],
    threshold: 3,
    patterns: [
        { pattern: /^\s*\{[\s\S]*\}\s*$/, weight: 2, description: "object literal" },
        { pattern: /^\s*\[[\s\S]*\]\s*$/, weight: 2, description: "array literal" },
        { pattern: /"[\w\-]+"\s*:\s*/, weight: 3, description: "key-value pair" },
        { pattern: /"[\w\-]+"\s*:\s*\{/, weight: 2, description: "nested object" },
        { pattern: /"[\w\-]+"\s*:\s*\[/, weight: 2, description: "array value" },
        { pattern: /"[\w\-]+"\s*:\s*"[^"]*"/, weight: 2, description: "string value" },
        { pattern: /"[\w\-]+"\s*:\s*\d+/, weight: 2, description: "number value" },
        { pattern: /"[\w\-]+"\s*:\s*(true|false|null)/, weight: 2, description: "boolean/null value" },
        { pattern: /,\s*"[\w\-]+"\s*:/, weight: 2, description: "multiple properties" },
        { pattern: /\[\s*"[^"]*"(\s*,\s*"[^"]*")*\s*\]/, weight: 2, description: "string array" },
        { pattern: /\[\s*\d+(\s*,\s*\d+)*\s*\]/, weight: 2, description: "number array" },
        { pattern: /\[\s*{[\s\S]*?}\s*(,\s*{[\s\S]*?}\s*)*\]/, weight: 2, description: "object array" },
        // Common JSON file patterns
        { pattern: /"name"\s*:\s*"/, weight: 1, description: "name field" },
        { pattern: /"version"\s*:\s*"/, weight: 1, description: "version field" },
        { pattern: /"dependencies"\s*:\s*\{/, weight: 2, description: "dependencies" },
        { pattern: /"scripts"\s*:\s*\{/, weight: 2, description: "scripts" },
    ]
};
