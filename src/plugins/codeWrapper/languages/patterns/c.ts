/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const c: LanguagePattern = {
    name: "C",
    identifier: "c",
    extensions: [".c", ".h"],
    threshold: 3,
    patterns: [
        { pattern: /#include\s*<[\w./]+\.h>/, weight: 2, description: "header include" },
        { pattern: /#include\s*"[\w./]+\.h"/, weight: 2, description: "local header include" },
        { pattern: /#define\s+\w+/, weight: 2, description: "macro define" },
        { pattern: /#ifdef|#ifndef|#endif|#else|#elif/, weight: 2, description: "preprocessor conditionals" },
        { pattern: /\bint\s+main\s*\([^)]*\)/, weight: 3, description: "main function" },
        { pattern: /\bprintf\s*\(|scanf\s*\(/, weight: 3, description: "printf/scanf" },
        { pattern: /\b(malloc|calloc|realloc|free)\s*\(/, weight: 3, description: "memory functions" },
        { pattern: /\bsizeof\s*\(/, weight: 2, description: "sizeof operator" },
        { pattern: /\b(int|char|float|double|long|short|unsigned|signed|void)\s+\w+/, weight: 1, description: "primitive types" },
        { pattern: /\bstruct\s+\w+\s*{/, weight: 2, description: "struct definition" },
        { pattern: /\benum\s+\w*\s*{/, weight: 2, description: "enum definition" },
        { pattern: /\bunion\s+\w+\s*{/, weight: 2, description: "union definition" },
        { pattern: /\btypedef\s+/, weight: 2, description: "typedef" },
        { pattern: /\bstatic\s+\w+/, weight: 1, description: "static" },
        { pattern: /\bextern\s+\w+/, weight: 2, description: "extern" },
        { pattern: /\bconst\s+\w+/, weight: 1, description: "const" },
        { pattern: /\bvolatile\s+/, weight: 2, description: "volatile" },
        { pattern: /\b(FILE|stdin|stdout|stderr)\b/, weight: 2, description: "file pointers" },
        { pattern: /\bfopen\s*\(|fclose\s*\(|fread\s*\(|fwrite\s*\(/, weight: 2, description: "file operations" },
        { pattern: /\bstrcpy|strcat|strlen|strcmp|strncpy/, weight: 2, description: "string functions" },
        { pattern: /\bmemcpy|memset|memmove/, weight: 2, description: "memory functions" },
        { pattern: /\*\w+\s*=|\w+\s*\*\s*\w+/, weight: 1, description: "pointer operations" },
        { pattern: /&\w+/, weight: 0.5, description: "address-of operator" },
        { pattern: /->\w+/, weight: 1, description: "pointer member access" },
        { pattern: /\bNULL\b/, weight: 2, description: "NULL pointer" },
    ]
};
