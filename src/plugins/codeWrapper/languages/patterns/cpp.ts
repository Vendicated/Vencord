/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const cpp: LanguagePattern = {
    name: "C++",
    identifier: "cpp",
    extensions: [".cpp", ".cc", ".cxx", ".hpp", ".hxx", ".h++"],
    threshold: 3,
    patterns: [
        { pattern: /#include\s*<[\w./]+>/, weight: 2, description: "system include" },
        { pattern: /#include\s*"[\w./]+"/, weight: 2, description: "local include" },
        { pattern: /\busing\s+namespace\s+\w+;/, weight: 3, description: "using namespace" },
        { pattern: /\bstd::\w+/, weight: 3, description: "std namespace" },
        { pattern: /\bcout\s*<<|cin\s*>>/, weight: 3, description: "iostream operators" },
        { pattern: /\bint\s+main\s*\([^)]*\)/, weight: 3, description: "main function" },
        { pattern: /\b(class|struct)\s+\w+(\s*:\s*(public|private|protected)\s+\w+)?/, weight: 2, description: "class/struct" },
        { pattern: /\btemplate\s*<[\w\s,]+>/, weight: 3, description: "template" },
        { pattern: /\b(public|private|protected)\s*:/, weight: 2, description: "access specifier" },
        { pattern: /\bvirtual\s+\w+/, weight: 2, description: "virtual method" },
        { pattern: /\bconst\s+\w+\s*&|\w+\s*&&/, weight: 2, description: "const ref/rvalue ref" },
        { pattern: /\b(vector|map|set|list|queue|stack|unordered_map)</, weight: 2, description: "STL containers" },
        { pattern: /\b(unique_ptr|shared_ptr|weak_ptr)</, weight: 3, description: "smart pointers" },
        { pattern: /\bnew\s+\w+(\[|\()|\bdelete\s+/, weight: 2, description: "new/delete" },
        { pattern: /\bnullptr\b/, weight: 3, description: "nullptr" },
        { pattern: /\bauto\s+\w+\s*=/, weight: 2, description: "auto keyword" },
        { pattern: /\blambda\s+|=\s*\[\s*[&=]?\s*\]\s*\(/, weight: 2, description: "lambda" },
        { pattern: /\bstatic_cast<|dynamic_cast<|reinterpret_cast</, weight: 3, description: "C++ casts" },
        { pattern: /\bconst\s+char\s*\*/, weight: 2, description: "const char*" },
        { pattern: /\bnamespace\s+\w+\s*{/, weight: 2, description: "namespace" },
        { pattern: /\boperator\s*[+\-*/%=<>!&|^~\[\]()]+/, weight: 2, description: "operator overload" },
        { pattern: /\bfriend\s+class/, weight: 2, description: "friend class" },
        { pattern: /\bexplicit\s+\w+/, weight: 2, description: "explicit constructor" },
        { pattern: /\bconstexpr\s+/, weight: 3, description: "constexpr" },
        { pattern: /\bnoexcept\b/, weight: 2, description: "noexcept" },
    ]
};
