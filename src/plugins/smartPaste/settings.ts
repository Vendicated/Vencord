/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const SmartPasteLanguages = [
    "plaintext",
    "javascript",
    "typescript",
    "jsx",
    "tsx",
    "python",
    "json",
    "html",
    "css",
    "scss",
    "c",
    "cpp",
    "csharp",
    "java",
    "kotlin",
    "swift",
    "rust",
    "go",
    "php",
    "ruby",
    "lua",
    "sql",
    "bash",
    "powershell",
    "yaml",
    "toml",
    "ini",
    "xml",
    "dockerfile",
    "markdown",
    "log",
] as const;

export type SmartPasteLanguage = typeof SmartPasteLanguages[number];

export const SmartPasteLanguageLabels: Record<SmartPasteLanguage, string> = {
    plaintext: "Plain Text",
    javascript: "JavaScript",
    typescript: "TypeScript",
    jsx: "JSX",
    tsx: "TSX",
    python: "Python",
    json: "JSON",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    c: "C",
    cpp: "C++",
    csharp: "C#",
    java: "Java",
    kotlin: "Kotlin",
    swift: "Swift",
    rust: "Rust",
    go: "Go",
    php: "PHP",
    ruby: "Ruby",
    lua: "Lua",
    sql: "SQL",
    bash: "Bash",
    powershell: "PowerShell",
    yaml: "YAML",
    toml: "TOML",
    ini: "INI",
    xml: "XML",
    dockerfile: "Dockerfile",
    markdown: "Markdown",
    log: "Log",
};

export const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Smart Paste",
        default: true,
    },
    autoDetectLanguage: {
        type: OptionType.BOOLEAN,
        description: "Auto detect the pasted programming language",
        default: true,
    },
    alwaysUsePlaintext: {
        type: OptionType.BOOLEAN,
        description: "Always use a plain fenced code block instead of the detected language",
        default: false,
    },
    askBeforeWrapping: {
        type: OptionType.BOOLEAN,
        description: "Ask before wrapping pasted text in a code block",
        default: false,
    },
    minimumLines: {
        type: OptionType.NUMBER,
        description: "Minimum number of lines before Smart Paste considers wrapping",
        default: 2,
    },
    minimumCharacters: {
        type: OptionType.NUMBER,
        description: "Minimum number of characters before Smart Paste considers wrapping",
        default: 40,
    },
    ignoreSingleLineSnippets: {
        type: OptionType.BOOLEAN,
        description: "Never auto-wrap single-line snippets",
        default: true,
    },
}).withPrivateSettings<{
    lastLanguageChoice?: SmartPasteLanguage;
}>();
