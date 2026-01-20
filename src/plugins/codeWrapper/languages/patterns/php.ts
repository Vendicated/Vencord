/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const php: LanguagePattern = {
    name: "PHP",
    identifier: "php",
    extensions: [".php", ".phtml", ".php3", ".php4", ".php5", ".phps"],
    threshold: 3,
    patterns: [
        { pattern: /<\?php/, weight: 4, description: "PHP opening tag" },
        { pattern: /\$\w+\s*=/, weight: 2, description: "variable assignment" },
        { pattern: /\bfunction\s+\w+\s*\([^)]*\)/, weight: 2, description: "function" },
        { pattern: /\bclass\s+\w+(\s+extends\s+\w+)?(\s+implements\s+\w+)?/, weight: 2, description: "class" },
        { pattern: /\bnamespace\s+[\w\\]+;/, weight: 3, description: "namespace" },
        { pattern: /\buse\s+[\w\\]+;/, weight: 2, description: "use statement" },
        { pattern: /\becho\s+/, weight: 2, description: "echo" },
        { pattern: /\bprint_r\s*\(|\bvar_dump\s*\(/, weight: 2, description: "debug functions" },
        { pattern: /\brequire(_once)?\s*\(|\binclude(_once)?\s*\(/, weight: 2, description: "require/include" },
        { pattern: /\b(public|private|protected)\s+(static\s+)?function/, weight: 2, description: "method" },
        { pattern: /\b(public|private|protected)\s+\$\w+/, weight: 2, description: "property" },
        { pattern: /\$this->\w+/, weight: 2, description: "$this" },
        { pattern: /\bforeach\s*\(\s*\$\w+\s+as\s+/, weight: 2, description: "foreach" },
        { pattern: /\barray\s*\(|=>\s*/, weight: 1, description: "array" },
        { pattern: /\[\s*['"]?\w+['"]?\s*=>/, weight: 1, description: "associative array" },
        { pattern: /\bnew\s+\w+\(/, weight: 1, description: "new" },
        { pattern: /\b(string|int|float|bool|array|object|mixed|void)\s+\$/, weight: 2, description: "type hints" },
        { pattern: /:\s*(string|int|float|bool|array|void)/, weight: 2, description: "return type" },
        { pattern: /\b\$_GET|\$_POST|\$_SESSION|\$_SERVER|\$_REQUEST/, weight: 2, description: "superglobals" },
        { pattern: /\.=\s*/, weight: 1, description: "string concatenation" },
        { pattern: /->|\s::\s/, weight: 1, description: "arrow/scope operators" },
        { pattern: /\?\?/, weight: 2, description: "null coalescing" },
        { pattern: /\?->/, weight: 2, description: "nullsafe operator" },
        { pattern: /#\[\w+/, weight: 3, description: "attributes (PHP 8)" },
    ]
};
