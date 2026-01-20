/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const ruby: LanguagePattern = {
    name: "Ruby",
    identifier: "rb",
    extensions: [".rb", ".erb", ".rake", ".gemspec"],
    threshold: 3,
    patterns: [
        { pattern: /\bdef\s+\w+(\([^)]*\))?/, weight: 2, description: "method definition" },
        { pattern: /\bclass\s+\w+(\s*<\s*\w+)?/, weight: 2, description: "class" },
        { pattern: /\bmodule\s+\w+/, weight: 2, description: "module" },
        { pattern: /\bend\b/, weight: 1, description: "end keyword" },
        { pattern: /\brequire\s+['"][\w\/]+['"]/, weight: 2, description: "require" },
        { pattern: /\brequire_relative\s+['"]/, weight: 2, description: "require_relative" },
        { pattern: /\bputs\s+/, weight: 2, description: "puts" },
        { pattern: /\battr_(reader|writer|accessor)\s+:/, weight: 3, description: "attr accessors" },
        { pattern: /\bif\s+.+$|unless\s+.+$/, weight: 1, description: "if/unless" },
        { pattern: /\bdo\s*\|[\w,\s]+\|/, weight: 2, description: "block with params" },
        { pattern: /\{\s*\|[\w,\s]+\|/, weight: 2, description: "brace block" },
        { pattern: /\beach\s+do|\bmap\s+do|\bselect\s+do/, weight: 2, description: "iterators" },
        { pattern: /\w+\.each\s*[{]?\s*\|/, weight: 2, description: "each method" },
        { pattern: /:\w+\s*=>|"?\w+"?:/, weight: 1, description: "hash keys" },
        { pattern: /@\w+\s*=/, weight: 2, description: "instance variable" },
        { pattern: /@@\w+\s*=/, weight: 2, description: "class variable" },
        { pattern: /\$\w+/, weight: 1, description: "global variable" },
        { pattern: /:\w+/, weight: 1, description: "symbol" },
        { pattern: /\bprivate|\bprotected|\bpublic/, weight: 2, description: "visibility" },
        { pattern: /\binitialize\s*\(/, weight: 2, description: "constructor" },
        { pattern: /\bself\.\w+/, weight: 1, description: "self" },
        { pattern: /\bnil\b/, weight: 2, description: "nil" },
        { pattern: /\blambda\s*{|->/, weight: 2, description: "lambda" },
        { pattern: /\bRails\.|ActiveRecord|ApplicationController/, weight: 3, description: "Rails" },
        { pattern: /\braise\s+\w+Error/, weight: 2, description: "raise exception" },
        { pattern: /#{\w+}/, weight: 1, description: "string interpolation" },
    ]
};
