/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const lua: LanguagePattern = {
    name: "Lua",
    identifier: "lua",
    extensions: [".lua"],
    threshold: 3,
    patterns: [
        { pattern: /\bfunction\s+[\w.:]+\s*\([^)]*\)/, weight: 2, description: "function" },
        { pattern: /\blocal\s+function\s+\w+/, weight: 2, description: "local function" },
        { pattern: /\blocal\s+\w+\s*=/, weight: 2, description: "local variable" },
        { pattern: /\bend\b/, weight: 1, description: "end keyword" },
        { pattern: /\bif\s+.+\s+then\b/, weight: 2, description: "if then" },
        { pattern: /\belseif\s+.+\s+then\b/, weight: 2, description: "elseif" },
        { pattern: /\bfor\s+\w+\s*=\s*\d+,\s*\d+/, weight: 2, description: "for loop" },
        { pattern: /\bfor\s+\w+,\s*\w+\s+in\s+(pairs|ipairs)\(/, weight: 3, description: "for pairs/ipairs" },
        { pattern: /\bwhile\s+.+\s+do\b/, weight: 2, description: "while do" },
        { pattern: /\brepeat\b[\s\S]*?\buntil\b/, weight: 2, description: "repeat until" },
        { pattern: /\bprint\s*\(/, weight: 2, description: "print" },
        { pattern: /\brequire\s*\(['"]\w+['"]\)/, weight: 2, description: "require" },
        { pattern: /\breturn\s+/, weight: 1, description: "return" },
        { pattern: /\bnil\b/, weight: 2, description: "nil" },
        { pattern: /\btrue\b|\bfalse\b/, weight: 1, description: "boolean" },
        { pattern: /\band\b|\bor\b|\bnot\b/, weight: 1, description: "logical operators" },
        { pattern: /\.\./, weight: 2, description: "string concatenation" },
        { pattern: /#\w+/, weight: 1, description: "length operator" },
        { pattern: /\w+:\w+\s*\(/, weight: 2, description: "method call" },
        { pattern: /\{[\s\S]*?\}/, weight: 1, description: "table literal" },
        { pattern: /\[\[[\s\S]*?\]\]/, weight: 2, description: "long string" },
        { pattern: /--\[\[[\s\S]*?\]\]/, weight: 2, description: "block comment" },
        { pattern: /--.*$/, weight: 1, description: "line comment" },
        { pattern: /\bdo\b/, weight: 1, description: "do block" },
        { pattern: /setmetatable\s*\(|getmetatable\s*\(/, weight: 2, description: "metatable" },
    ]
};
