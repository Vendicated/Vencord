/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const rust: LanguagePattern = {
    name: "Rust",
    identifier: "rs",
    extensions: [".rs"],
    threshold: 3,
    patterns: [
        { pattern: /\bfn\s+\w+\s*(<[\w,\s]+>)?\s*\([^)]*\)\s*(->)?/, weight: 3, description: "function definition" },
        { pattern: /\blet\s+(mut\s+)?\w+\s*(:\s*\w+)?\s*=/, weight: 2, description: "let binding" },
        { pattern: /\bstruct\s+\w+(<[\w,\s]+>)?\s*[{(]?/, weight: 3, description: "struct definition" },
        { pattern: /\benum\s+\w+(<[\w,\s]+>)?\s*{/, weight: 3, description: "enum definition" },
        { pattern: /\bimpl(<[\w,\s]+>)?\s+(\w+\s+for\s+)?\w+/, weight: 3, description: "impl block" },
        { pattern: /\btrait\s+\w+(<[\w,\s]+>)?/, weight: 3, description: "trait definition" },
        { pattern: /\buse\s+[\w:]+(\s*::\s*[\w*{}]+)*;/, weight: 2, description: "use statement" },
        { pattern: /\bmod\s+\w+;?/, weight: 2, description: "module declaration" },
        { pattern: /\bpub(\([\w]+\))?\s+(fn|struct|enum|mod|trait|type|const|static)/, weight: 2, description: "public item" },
        { pattern: /\bprintln!\s*\(|print!\s*\(|format!\s*\(/, weight: 3, description: "print macros" },
        { pattern: /\bvec!\s*\[/, weight: 3, description: "vec macro" },
        { pattern: /\bSome\s*\(|\bNone\b|\bOk\s*\(|\bErr\s*\(/, weight: 3, description: "Option/Result variants" },
        { pattern: /\bOption<\w+>|\bResult<[\w,\s]+>/, weight: 3, description: "Option/Result types" },
        { pattern: /\bString::|\bVec::|&str\b/, weight: 2, description: "common types" },
        { pattern: /\bmatch\s+\w+\s*{/, weight: 2, description: "match expression" },
        { pattern: /\bif\s+let\s+(Some|Ok)\(/, weight: 2, description: "if let" },
        { pattern: /\bwhile\s+let\s+/, weight: 2, description: "while let" },
        { pattern: /\bloop\s*{/, weight: 2, description: "loop" },
        { pattern: /\b(u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64|bool|char)\b/, weight: 2, description: "primitive types" },
        { pattern: /\bunwrap\(\)|expect\(|\.ok\(\)|\.err\(\)/, weight: 2, description: "unwrap methods" },
        { pattern: /#\[[\w(,\s="]+\]/, weight: 2, description: "attributes" },
        { pattern: /\bcrate::\w+|self::\w+|super::\w+/, weight: 2, description: "path prefixes" },
        { pattern: /'[\w]+:/, weight: 2, description: "lifetimes" },
        { pattern: /&'?\s*(mut\s+)?\w+/, weight: 1, description: "references" },
        { pattern: /\basync\s+fn|\bawait\b/, weight: 2, description: "async/await" },
        { pattern: /\bBox<\w+>|Arc<\w+>|Rc<\w+>/, weight: 2, description: "smart pointers" },
    ]
};
