/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const yaml: LanguagePattern = {
    name: "YAML",
    identifier: "yaml",
    extensions: [".yaml", ".yml"],
    threshold: 3,
    patterns: [
        { pattern: /^[\w\-]+:\s*$/m, weight: 2, description: "key without value" },
        { pattern: /^[\w\-]+:\s+\S+/m, weight: 2, description: "key-value pair" },
        { pattern: /^[\w\-]+:\s*\|/m, weight: 3, description: "literal block" },
        { pattern: /^[\w\-]+:\s*>/m, weight: 3, description: "folded block" },
        { pattern: /^\s+-\s+/m, weight: 2, description: "list item" },
        { pattern: /^\s+-\s+[\w\-]+:\s+/m, weight: 2, description: "list of objects" },
        { pattern: /^\s+[\w\-]+:\s+/m, weight: 1, description: "nested key" },
        { pattern: /^---\s*$/m, weight: 3, description: "document start" },
        { pattern: /^\.\.\.\s*$/m, weight: 3, description: "document end" },
        { pattern: /&\w+\s*$|^\s*\*\w+\s*$/m, weight: 2, description: "anchor/alias" },
        { pattern: /^#.*$/m, weight: 1, description: "comment" },
        { pattern: /:\s*\[\s*[\w,\s"']+\s*\]/, weight: 2, description: "inline array" },
        { pattern: /:\s*\{\s*[\w:,\s"']+\s*\}/, weight: 2, description: "inline object" },
        { pattern: /!!\w+\s+/, weight: 2, description: "type tag" },
        { pattern: /:\s*(true|false|yes|no|on|off)\s*$/im, weight: 2, description: "boolean values" },
        { pattern: /:\s*null\s*$/im, weight: 2, description: "null value" },
        { pattern: /:\s*~\s*$/m, weight: 2, description: "null with tilde" },
        // Common YAML file patterns
        { pattern: /^name:\s+/m, weight: 1, description: "name field" },
        { pattern: /^version:\s+/m, weight: 1, description: "version field" },
        { pattern: /^services:\s*$/m, weight: 2, description: "docker compose" },
        { pattern: /^apiVersion:\s+/m, weight: 2, description: "kubernetes" },
    ]
};
