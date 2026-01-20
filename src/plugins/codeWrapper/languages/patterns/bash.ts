/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const bash: LanguagePattern = {
    name: "Bash",
    identifier: "bash",
    extensions: [".sh", ".bash", ".zsh"],
    threshold: 3,
    patterns: [
        { pattern: /^#!/, weight: 3, description: "shebang" },
        { pattern: /\becho\s+/, weight: 2, description: "echo" },
        { pattern: /\$\{?\w+\}?/, weight: 1, description: "variable expansion" },
        { pattern: /\bexport\s+\w+=/, weight: 2, description: "export" },
        { pattern: /\bif\s+\[\s+/, weight: 2, description: "if condition" },
        { pattern: /\bthen\b|\bfi\b/, weight: 2, description: "then/fi" },
        { pattern: /\belse\b|\belif\s+/, weight: 1, description: "else/elif" },
        { pattern: /\bfor\s+\w+\s+in\b/, weight: 2, description: "for loop" },
        { pattern: /\bwhile\s+\[|\bwhile\s+true/, weight: 2, description: "while loop" },
        { pattern: /\bdo\b|\bdone\b/, weight: 1, description: "do/done" },
        { pattern: /\bcase\s+.+\s+in/, weight: 2, description: "case" },
        { pattern: /\besac\b/, weight: 2, description: "esac" },
        { pattern: /\bfunction\s+\w+|^\w+\s*\(\)\s*{/m, weight: 2, description: "function" },
        { pattern: /\bsource\s+|^\.\s+/m, weight: 2, description: "source" },
        { pattern: /\bread\s+/, weight: 2, description: "read" },
        { pattern: /\b(cd|ls|pwd|mkdir|rm|cp|mv|cat|grep|sed|awk)\s+/, weight: 2, description: "common commands" },
        { pattern: /\|\s*\w+|2>&1|>&2|&>/, weight: 2, description: "redirections" },
        { pattern: /\$\(.*\)|`.*`/, weight: 2, description: "command substitution" },
        { pattern: /\[\[\s+.*\s+\]\]/, weight: 2, description: "extended test" },
        { pattern: /-[a-z]\s+\w+|--([\w-]+)/, weight: 1, description: "command flags" },
        { pattern: /\$@|\$\*|\$#|\$\?|\$\$/, weight: 2, description: "special variables" },
        { pattern: /\$\d/, weight: 1, description: "positional parameter" },
        { pattern: /\bshift\b|\bbreak\b|\bcontinue\b/, weight: 1, description: "control flow" },
        { pattern: /\blocal\s+\w+=/, weight: 2, description: "local variable" },
        { pattern: /\bexit\s+\d*/, weight: 1, description: "exit" },
    ]
};
