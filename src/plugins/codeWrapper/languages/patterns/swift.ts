/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const swift: LanguagePattern = {
    name: "Swift",
    identifier: "swift",
    extensions: [".swift"],
    threshold: 3,
    patterns: [
        { pattern: /\bfunc\s+\w+\s*(<[\w,\s:]+>)?\s*\([^)]*\)\s*(->|throws|rethrows)?/, weight: 3, description: "function" },
        { pattern: /\blet\s+\w+\s*(:\s*[\w<>\[\]?!]+)?\s*=/, weight: 2, description: "let declaration" },
        { pattern: /\bvar\s+\w+\s*(:\s*[\w<>\[\]?!]+)?/, weight: 2, description: "var declaration" },
        { pattern: /\bclass\s+\w+(\s*<[\w,\s:]+>)?(\s*:\s*\w+)?/, weight: 2, description: "class" },
        { pattern: /\bstruct\s+\w+(\s*<[\w,\s:]+>)?(\s*:\s*\w+)?/, weight: 2, description: "struct" },
        { pattern: /\bprotocol\s+\w+/, weight: 3, description: "protocol" },
        { pattern: /\benum\s+\w+\s*(:\s*\w+)?\s*{/, weight: 2, description: "enum" },
        { pattern: /\bextension\s+\w+/, weight: 3, description: "extension" },
        { pattern: /\bimport\s+(Foundation|UIKit|SwiftUI|Combine)/, weight: 3, description: "import" },
        { pattern: /\bprint\s*\(/, weight: 2, description: "print" },
        { pattern: /\bguard\s+let\s+/, weight: 3, description: "guard let" },
        { pattern: /\bif\s+let\s+/, weight: 2, description: "if let" },
        { pattern: /\bswitch\s+\w+\s*{/, weight: 1, description: "switch" },
        { pattern: /\bcase\s+\.\w+:/, weight: 2, description: "enum case" },
        { pattern: /\b(String|Int|Double|Float|Bool|Array|Dictionary|Set)\b/, weight: 1, description: "Swift types" },
        { pattern: /\bOptional<\w+>|\w+\?/, weight: 2, description: "optional" },
        { pattern: /\btry\??\s+/, weight: 1, description: "try" },
        { pattern: /\bdo\s*{[\s\S]*catch/, weight: 2, description: "do-catch" },
        { pattern: /\b@\w+/, weight: 2, description: "attribute" },
        { pattern: /\b(public|private|internal|fileprivate|open)\s+/, weight: 1, description: "access modifiers" },
        { pattern: /\bself\.\w+/, weight: 1, description: "self" },
        { pattern: /\bweak\s+var|\bunowned\s+/, weight: 2, description: "memory management" },
        { pattern: /\b@State\s+|\b@Binding\s+|\b@Published\s+/, weight: 3, description: "SwiftUI property wrappers" },
        { pattern: /\bsome\s+View/, weight: 3, description: "SwiftUI body" },
        { pattern: /\bCodable\b|Encodable\b|Decodable\b/, weight: 2, description: "Codable" },
        { pattern: /\basync\s+func|\bawait\s+/, weight: 2, description: "async/await" },
    ]
};
