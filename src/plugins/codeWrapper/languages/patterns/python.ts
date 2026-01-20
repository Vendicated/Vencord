/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const python: LanguagePattern = {
    name: "Python",
    identifier: "py",
    extensions: [".py", ".pyw", ".pyi"],
    threshold: 3,
    patterns: [
        { pattern: /\bdef\s+\w+\s*\([^)]*\)\s*(->\s*\w+)?\s*:/, weight: 3, description: "function definition" },
        { pattern: /\bclass\s+\w+(\([^)]*\))?\s*:/, weight: 3, description: "class definition" },
        { pattern: /\bimport\s+[\w.]+|\bfrom\s+[\w.]+\s+import/, weight: 2, description: "import statement" },
        { pattern: /\bif\s+.+:\s*$/, weight: 1, description: "if statement" },
        { pattern: /\bfor\s+\w+\s+in\s+.+:/, weight: 2, description: "for loop" },
        { pattern: /\bwhile\s+.+:/, weight: 1, description: "while loop" },
        { pattern: /\bprint\s*\(/, weight: 2, description: "print function" },
        { pattern: /\bself\.\w+/, weight: 3, description: "self reference" },
        { pattern: /\b__init__\s*\(/, weight: 3, description: "constructor" },
        { pattern: /\b__\w+__/, weight: 2, description: "dunder methods" },
        { pattern: /\b(True|False|None)\b/, weight: 1, description: "Python constants" },
        { pattern: /\bexcept\s+(\w+)?:/, weight: 2, description: "except clause" },
        { pattern: /\btry\s*:/, weight: 1, description: "try block" },
        { pattern: /\braise\s+\w+/, weight: 2, description: "raise exception" },
        { pattern: /\bwith\s+.+\s+as\s+\w+:/, weight: 2, description: "with statement" },
        { pattern: /\blambda\s+\w*:/, weight: 2, description: "lambda" },
        { pattern: /\b(async\s+def|await)\s+/, weight: 2, description: "async/await" },
        { pattern: /\bif\s+__name__\s*==\s*['"]__main__['"]/, weight: 3, description: "main guard" },
        { pattern: /\b(list|dict|set|tuple)\s*\(/, weight: 1, description: "type constructors" },
        { pattern: /\[\s*\w+\s+for\s+\w+\s+in\s+/, weight: 2, description: "list comprehension" },
        { pattern: /{\s*\w+\s*:\s*\w+\s+for\s+/, weight: 2, description: "dict comprehension" },
        { pattern: /@\w+(\([^)]*\))?/, weight: 2, description: "decorator" },
        { pattern: /\b(str|int|float|bool|bytes)\s*\(/, weight: 1, description: "type casting" },
        { pattern: /\blen\s*\(|\brange\s*\(|\benumerate\s*\(/, weight: 1, description: "built-in functions" },
        { pattern: /\bf?(['"]){3}[\s\S]*?\1{3}/, weight: 2, description: "docstring" },
        { pattern: /\btyping\.(List|Dict|Optional|Union|Tuple)/, weight: 3, description: "typing module" },
        { pattern: /:\s*(str|int|float|bool|List|Dict|Optional)\b/, weight: 2, description: "type hints" },
    ]
};
