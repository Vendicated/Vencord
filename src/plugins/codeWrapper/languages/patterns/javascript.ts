/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const javascript: LanguagePattern = {
    name: "JavaScript",
    identifier: "js",
    extensions: [".js", ".mjs", ".cjs"],
    threshold: 3,
    patterns: [
        { pattern: /\b(const|let|var)\s+\w+\s*=/, weight: 1, description: "variable declaration" },
        { pattern: /\bfunction\s+\w*\s*\(/, weight: 2, description: "function declaration" },
        { pattern: /\b(async\s+)?function\s*\*/, weight: 2, description: "generator function" },
        { pattern: /=>\s*[{(]/, weight: 1, description: "arrow function" },
        { pattern: /\bconsole\.(log|error|warn|info|debug)\(/, weight: 2, description: "console methods" },
        { pattern: /\bdocument\.(getElementById|querySelector|createElement)/, weight: 2, description: "DOM methods" },
        { pattern: /\bwindow\.\w+/, weight: 1, description: "window object" },
        { pattern: /\bmodule\.exports|exports\.\w+/, weight: 3, description: "CommonJS exports" },
        { pattern: /\brequire\s*\(['"]\w+['"]\)/, weight: 2, description: "require" },
        { pattern: /\b(import|export)\s+(default\s+)?({[\w,\s]+}|[\w]+)\s+(from\s+)?/, weight: 2, description: "ES modules" },
        { pattern: /\bnew\s+Promise\s*\(/, weight: 2, description: "Promise" },
        { pattern: /\b(async|await)\s+/, weight: 1, description: "async/await" },
        { pattern: /\.(then|catch|finally)\s*\(/, weight: 1, description: "promise chain" },
        { pattern: /\bclass\s+\w+(\s+extends\s+\w+)?/, weight: 2, description: "class declaration" },
        { pattern: /\bthis\.\w+/, weight: 1, description: "this keyword" },
        { pattern: /\b(Array|Object|String|Number|Boolean)\.(prototype|isArray|keys|values)/, weight: 1, description: "built-in methods" },
        { pattern: /\b\w+\.(map|filter|reduce|forEach|find|some|every)\(/, weight: 1, description: "array methods" },
        { pattern: /\bJSON\.(parse|stringify)\(/, weight: 1, description: "JSON methods" },
        { pattern: /\bsetTimeout|setInterval|clearTimeout|clearInterval/, weight: 1, description: "timer functions" },
        { pattern: /\bfetch\s*\(['"](https?:)?\/\//, weight: 2, description: "fetch API" },
        { pattern: /\b(null|undefined|NaN|Infinity)\b/, weight: 0.5, description: "JS primitives" },
        { pattern: /===|!==/, weight: 0.5, description: "strict equality" },
        { pattern: /\.\.\.\w+/, weight: 1, description: "spread operator" },
        { pattern: /`[^`]*\$\{[^}]+\}[^`]*`/, weight: 2, description: "template literal" },
        { pattern: /\[\s*\.{3}/, weight: 1, description: "spread in array" },
    ]
};
