/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { FormSwitch } from "@components/FormSwitch";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, ComponentDispatch, createRoot, DraftType, Forms, i18n, LocaleStore, React, SelectedChannelStore, showToast, Toasts, Tooltip, UploadHandler, useEffect, useRef, useState } from "@webpack/common";
import deXml from "file://i18n/de.xml";
import enXml from "file://i18n/en.xml";
import frXml from "file://i18n/fr.xml";
import type { ReactNode } from "react";
import type { Root } from "react-dom/client";

const ACTION_DISPLAY_BUTTONS = "buttons";
const ACTION_DISPLAY_DROPDOWN = "dropdown";
const LocaleManager = findByPropsLazy("getLocale") as Record<string, unknown>;

const languageXml = {
    en: enXml,
    fr: frXml,
    de: deXml
};
const translationCache = new Map<keyof typeof languageXml, Record<string, string>>();

function parseLanguageXml(language: keyof typeof languageXml) {
    const cached = translationCache.get(language);
    if (cached) return cached;

    const doc = new DOMParser().parseFromString(languageXml[language], "text/xml");
    const strings: Record<string, string> = {};

    doc.querySelectorAll("string[key]").forEach(node => {
        const key = node.getAttribute("key");
        if (key) strings[key] = node.textContent ?? "";
    });

    translationCache.set(language, strings);
    return strings;
}

function getLocaleCandidates() {
    const candidates: unknown[] = [];

    try {
        const localeStore = LocaleStore as unknown as Record<string, unknown> | undefined;
        candidates.push(
            localeStore?.locale,
            localeStore?.getLocale instanceof Function ? localeStore.getLocale() : undefined,
            localeStore?.getRawLocale instanceof Function ? localeStore.getRawLocale() : undefined
        );
    } catch { }

    try {
        candidates.push(
            LocaleManager?.locale,
            LocaleManager?.getLocale instanceof Function ? LocaleManager.getLocale() : undefined
        );
    } catch { }

    try {
        const intl = i18n?.intl as unknown as Record<string, unknown> | undefined;
        candidates.push(
            intl?.locale,
            intl?.resolvedLocale,
            intl?.initialLocale,
            intl?.defaultLocale,
            intl?.getLocale instanceof Function ? intl.getLocale() : undefined
        );
    } catch { }

    try {
        candidates.push(
            document.documentElement.lang,
            localStorage.getItem("locale"),
            localStorage.getItem("language"),
            localStorage.getItem("i18nextLng"),
            navigator.language,
            ...(navigator.languages ?? [])
        );
    } catch { }

    return candidates.filter((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0);
}

function getCurrentLanguage(): keyof typeof languageXml {
    for (const locale of getLocaleCandidates()) {
        const lowerLocale = locale.toLowerCase();
        if (lowerLocale === "fr" || lowerLocale.startsWith("fr-") || lowerLocale.startsWith("fr_")) return "fr";
        if (lowerLocale === "de" || lowerLocale.startsWith("de-") || lowerLocale.startsWith("de_")) return "de";
        if (lowerLocale === "en" || lowerLocale.startsWith("en-") || lowerLocale.startsWith("en_")) return "en";
    }

    return "en";
}

function t(key: string, values: Record<string, string | number> = {}) {
    const translations = parseLanguageXml(getCurrentLanguage());
    const fallbackTranslations = parseLanguageXml("en");
    const template = translations[key] ?? fallbackTranslations[key] ?? key;

    return template.replace(/\{(\w+)\}/g, (_, valueKey: string) => String(values[valueKey] ?? ""));
}

const settings = definePluginSettings({
    settingsMenu: {
        type: OptionType.COMPONENT,
        component: OuvrirDocumentSettings
    },
    enableShikiColoring: {
        type: OptionType.BOOLEAN,
        description: t("settings.general.useShiki.title"),
        default: true,
        hidden: true
    },
    enablePerformanceMode: {
        type: OptionType.BOOLEAN,
        description: t("settings.general.enablePerformance.title"),
        default: true,
        hidden: true
    },
    useShikiInEditMode: {
        type: OptionType.BOOLEAN,
        description: t("settings.edit.useShiki.title"),
        default: true,
        hidden: true
    },
    showEditorLineNumbers: {
        type: OptionType.BOOLEAN,
        description: t("settings.edit.lineNumbers.title"),
        default: true,
        hidden: true
    },
    autoCloseViewer: {
        type: OptionType.BOOLEAN,
        description: t("settings.edit.autoClose.title"),
        default: false,
        hidden: true
    },
    insertShortcut: {
        type: OptionType.STRING,
        description: t("action.insert"),
        default: "CTRL + I",
        hidden: true
    },
    insertAndSendShortcut: {
        type: OptionType.STRING,
        description: t("action.insertAndSend"),
        default: "CTRL + ENTER",
        hidden: true
    },
    saveShortcut: {
        type: OptionType.STRING,
        description: t("action.save"),
        default: "CTRL + S",
        hidden: true
    },
    actionDisplayMode: {
        type: OptionType.SELECT,
        description: t("settings.edit.actionInterface.title"),
        options: [
            { label: t("settings.edit.actionInterface.buttons"), value: ACTION_DISPLAY_BUTTONS, default: true },
            { label: t("settings.edit.actionInterface.dropdown"), value: ACTION_DISPLAY_DROPDOWN }
        ],
        hidden: true
    },
    enableInsertAction: {
        type: OptionType.BOOLEAN,
        description: t("action.insert"),
        default: true,
        hidden: true
    },
    enableInsertAndSendAction: {
        type: OptionType.BOOLEAN,
        description: t("action.insertAndSend"),
        default: true,
        hidden: true
    },
    enableSaveAction: {
        type: OptionType.BOOLEAN,
        description: t("action.save"),
        default: true,
        hidden: true
    },
    closeOnShift: {
        type: OptionType.BOOLEAN,
        description: t("settings.actions.shiftClose.title"),
        default: true,
        hidden: true
    },
    autoPerformanceMode: {
        type: OptionType.BOOLEAN,
        description: t("settings.performance.auto.title"),
        default: true,
        hidden: true,
        disabled: () => !settings.store.enablePerformanceMode
    },
    autoPerformanceCharThreshold: {
        type: OptionType.NUMBER,
        description: t("settings.performance.characters.title"),
        default: 250_000,
        hidden: true,
        disabled: () => !settings.store.enablePerformanceMode || !settings.store.autoPerformanceMode,
        isValid: value => value >= 1 || t("validation.minimumOne")
    },
    autoPerformanceLineThreshold: {
        type: OptionType.NUMBER,
        description: t("settings.performance.lines.title"),
        default: 500,
        hidden: true,
        disabled: () => !settings.store.enablePerformanceMode || !settings.store.autoPerformanceMode,
        isValid: value => value >= 1 || t("validation.minimumOne")
    },
    forceShikiInPerformanceMode: {
        type: OptionType.BOOLEAN,
        description: t("settings.performance.forceShiki.title"),
        default: false,
        hidden: true,
        disabled: () => !settings.store.enablePerformanceMode || !settings.store.enableShikiColoring
    },
    allowManualPerformanceToggleInViewer: {
        type: OptionType.BOOLEAN,
        description: t("settings.performance.viewerToggle.title"),
        default: true,
        hidden: true,
        disabled: () => !settings.store.enablePerformanceMode
    }
});

function SettingsCategory({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean; }) {
    return (
        <details
            open={defaultOpen}
            style={{
                border: "1px solid var(--background-modifier-accent)",
                borderRadius: "8px",
                marginBottom: "12px",
                overflow: "hidden",
                color: "var(--text-normal)"
            }}
        >
            <summary
                style={{
                    cursor: "pointer",
                    fontWeight: 700,
                    padding: "12px 14px",
                    background: "var(--background-secondary)",
                    color: "var(--text-normal)"
                }}
            >
                {title}
            </summary>
            <div style={{ padding: "4px 14px 12px" }}>
                {children}
            </div>
        </details>
    );
}

function SettingTextInput({ title, description, value, onChange }: { title: string; description: string; value: string; onChange(value: string): void; }) {
    return (
        <label style={{ display: "block", padding: "12px 0", borderBottom: "1px solid var(--background-modifier-accent)", color: "var(--text-normal)" }}>
            <Forms.FormTitle tag="h5" style={{ color: "var(--text-normal)" }}>{title}</Forms.FormTitle>
            <Forms.FormText style={{ color: "var(--text-muted)", marginBottom: "8px" }}>{description}</Forms.FormText>
            <input
                value={value}
                onChange={e => onChange(e.currentTarget.value)}
                style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "8px 10px",
                    border: "1px solid var(--background-modifier-accent)",
                    borderRadius: "6px",
                    background: "var(--input-background)",
                    color: "var(--text-normal)",
                    outline: "none"
                }}
            />
        </label>
    );
}

function SettingSelect({ title, description, value, options, onChange }: {
    title: string;
    description: string;
    value: string;
    options: Array<{ label: string; value: string; }>;
    onChange(value: string): void;
}) {
    return (
        <label style={{ display: "block", padding: "12px 0", borderBottom: "1px solid var(--background-modifier-accent)", color: "var(--text-normal)" }}>
            <Forms.FormTitle tag="h5" style={{ color: "var(--text-normal)" }}>{title}</Forms.FormTitle>
            <Forms.FormText style={{ color: "var(--text-muted)", marginBottom: "8px" }}>{description}</Forms.FormText>
            <select
                value={value}
                onChange={e => onChange(e.currentTarget.value)}
                style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "8px 10px",
                    border: "1px solid var(--background-modifier-accent)",
                    borderRadius: "6px",
                    background: "var(--input-background)",
                    color: "var(--text-normal)",
                    outline: "none"
                }}
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
        </label>
    );
}

function OuvrirDocumentSettings() {
    const values = settings.use([
        "actionDisplayMode",
        "autoCloseViewer",
        "autoPerformanceLineThreshold",
        "autoPerformanceMode",
        "closeOnShift",
        "enableInsertAction",
        "enableInsertAndSendAction",
        "enablePerformanceMode",
        "enableSaveAction",
        "enableShikiColoring",
        "forceShikiInPerformanceMode",
        "insertAndSendShortcut",
        "insertShortcut",
        "saveShortcut",
        "showEditorLineNumbers",
        "useShikiInEditMode"
    ]);
    const [, rerender] = useState(0);

    const setSetting = <K extends keyof typeof settings.store>(key: K, value: typeof settings.store[K]) => {
        settings.store[key] = value;
        rerender(x => x + 1);
    };

    return (
        <div className="vc-ouvrir-document-settings" style={{ color: "#f2f3f5" }}>
            <style>
                {`
.vc-ouvrir-document-settings,
.vc-ouvrir-document-settings h1,
.vc-ouvrir-document-settings h2,
.vc-ouvrir-document-settings h3,
.vc-ouvrir-document-settings h4,
.vc-ouvrir-document-settings h5,
.vc-ouvrir-document-settings summary,
.vc-ouvrir-document-settings label,
.vc-ouvrir-document-settings span {
    color: #f2f3f5 !important;
}

.vc-ouvrir-document-settings p {
    color: #c9cdd4 !important;
}

.vc-ouvrir-document-settings input,
.vc-ouvrir-document-settings select {
    color: #f2f3f5 !important;
    background: #1e1f22 !important;
}
`}
            </style>
            <SettingsCategory title={t("settings.category.general")}>
                <FormSwitch
                    title={t("settings.general.useShiki.title")}
                    description={t("settings.general.useShiki.description")}
                    value={values.enableShikiColoring}
                    onChange={value => setSetting("enableShikiColoring", value)}
                />
                <FormSwitch
                    title={t("settings.general.enablePerformance.title")}
                    description={t("settings.general.enablePerformance.description")}
                    value={values.enablePerformanceMode}
                    onChange={value => setSetting("enablePerformanceMode", value)}
                    hideBorder
                />
            </SettingsCategory>

            <SettingsCategory title={t("settings.category.editMode")}>
                <FormSwitch
                    title={t("settings.edit.useShiki.title")}
                    description={t("settings.edit.useShiki.description")}
                    value={values.useShikiInEditMode}
                    onChange={value => setSetting("useShikiInEditMode", value)}
                />
                <FormSwitch
                    title={t("settings.edit.lineNumbers.title")}
                    description={t("settings.edit.lineNumbers.description")}
                    value={values.showEditorLineNumbers}
                    onChange={value => setSetting("showEditorLineNumbers", value)}
                />
                <FormSwitch
                    title={t("settings.edit.autoClose.title")}
                    description={t("settings.edit.autoClose.description")}
                    value={values.autoCloseViewer}
                    onChange={value => setSetting("autoCloseViewer", value)}
                />

                <Forms.FormTitle tag="h5" style={{ marginTop: "14px", color: "var(--text-normal)" }}>{t("settings.shortcuts.section")}</Forms.FormTitle>
                <SettingTextInput
                    title={t("action.insert")}
                    description={t("settings.shortcuts.default", { shortcut: "CTRL + I" })}
                    value={values.insertShortcut}
                    onChange={value => setSetting("insertShortcut", value)}
                />
                <SettingTextInput
                    title={t("action.insertAndSend")}
                    description={t("settings.shortcuts.default", { shortcut: "CTRL + ENTER" })}
                    value={values.insertAndSendShortcut}
                    onChange={value => setSetting("insertAndSendShortcut", value)}
                />
                <SettingTextInput
                    title={t("action.save")}
                    description={t("settings.shortcuts.default", { shortcut: "CTRL + S" })}
                    value={values.saveShortcut}
                    onChange={value => setSetting("saveShortcut", value)}
                />

                <SettingSelect
                    title={t("settings.edit.actionInterface.title")}
                    description={t("settings.edit.actionInterface.description")}
                    value={values.actionDisplayMode}
                    onChange={value => setSetting("actionDisplayMode", value)}
                    options={[
                        { label: t("settings.edit.actionInterface.buttons"), value: ACTION_DISPLAY_BUTTONS },
                        { label: t("settings.edit.actionInterface.dropdown"), value: ACTION_DISPLAY_DROPDOWN }
                    ]}
                />

                <details open style={{ marginTop: "12px" }}>
                    <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--text-normal)" }}>{t("settings.actions.section")}</summary>
                    <div style={{ paddingTop: "8px" }}>
                        <FormSwitch
                            title={t("action.insert")}
                            description={t("settings.actions.insert.description")}
                            value={values.enableInsertAction}
                            onChange={value => setSetting("enableInsertAction", value)}
                        />
                        <FormSwitch
                            title={t("action.insertAndSend")}
                            description={t("settings.actions.insertAndSend.description")}
                            value={values.enableInsertAndSendAction}
                            onChange={value => setSetting("enableInsertAndSendAction", value)}
                        />
                        <FormSwitch
                            title={t("action.save")}
                            description={t("settings.actions.save.description")}
                            value={values.enableSaveAction}
                            onChange={value => setSetting("enableSaveAction", value)}
                        />
                        <FormSwitch
                            title={t("settings.actions.shiftClose.title")}
                            description={t("settings.actions.shiftClose.description")}
                            value={values.closeOnShift}
                            onChange={value => setSetting("closeOnShift", value)}
                            hideBorder
                        />
                    </div>
                </details>
            </SettingsCategory>

            {values.enablePerformanceMode && (
                <SettingsCategory title={t("settings.category.performance")}>
                    <FormSwitch
                        title={t("settings.performance.auto.title")}
                        description={t("settings.performance.auto.description")}
                        value={values.autoPerformanceMode}
                        onChange={value => setSetting("autoPerformanceMode", value)}
                    />
                    <label style={{ display: "block", padding: "12px 0", borderBottom: "1px solid var(--background-modifier-accent)", color: "var(--text-normal)" }}>
                        <Forms.FormTitle tag="h5" style={{ color: "var(--text-normal)" }}>{t("settings.performance.lines.title")}</Forms.FormTitle>
                        <Forms.FormText style={{ color: "var(--text-muted)", marginBottom: "8px" }}>
                            {t("settings.performance.lines.description")}
                        </Forms.FormText>
                        <input
                            type="number"
                            min={1}
                            value={values.autoPerformanceLineThreshold}
                            onChange={e => setSetting("autoPerformanceLineThreshold", Math.max(1, Number(e.currentTarget.value) || 1))}
                            style={{
                                width: "100%",
                                boxSizing: "border-box",
                                padding: "8px 10px",
                                border: "1px solid var(--background-modifier-accent)",
                                borderRadius: "6px",
                                background: "var(--input-background)",
                                color: "var(--text-normal)",
                                outline: "none"
                            }}
                        />
                    </label>
                    <FormSwitch
                        title={t("settings.performance.forceShiki.title")}
                        description={t("settings.performance.forceShiki.description")}
                        value={values.forceShikiInPerformanceMode}
                        onChange={value => setSetting("forceShikiInPerformanceMode", value)}
                        hideBorder
                    />
                </SettingsCategory>
            )}
        </div>
    );
}

const TEXT_FILE_EXTENSIONS = new Set([
    "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "adoc", "asc", "asm", "astro", "awk",
    "bash", "bat", "bats", "bib", "blade", "c", "cabal", "cfg", "clj", "cljs", "cmake", "cmd", "conf", "config", "cpp", "cs", "csh", "css", "csv", "cts",
    "dart", "diff", "dockerfile", "dtd", "editorconfig", "env", "erl", "ex", "exs", "fish", "frag", "fs", "fsi", "fsx", "gemspec", "gitconfig", "gitignore", "gleam", "glsl", "gql", "gradle", "graphql", "groovy",
    "h", "handlebars", "hbs", "heex", "hh", "hpp", "hrl", "hs", "htm", "html", "http", "hxx",
    "ics", "ignore", "ini", "java", "jl", "js", "json", "json5", "jsonc", "jsx", "kdl", "kt", "kts", "less", "lhs", "liquid", "lock", "log", "lua",
    "m", "make", "markdown", "md", "mdx", "mjs", "mk", "mkd", "ml", "mli", "mts", "mustache", "nix",
    "patch", "php", "pl", "plist", "pm", "pp", "properties", "proto", "ps1", "psd1", "psm1", "pug", "py", "pyi", "pyw",
    "r", "rb", "rego", "res", "resi", "rs", "rss", "rst", "sass", "scala", "scss", "sh", "sln", "sol", "sql", "srt", "styl", "svelte", "swift",
    "tf", "tfvars", "toml", "ts", "tsx", "txt", "v", "vb", "vbs", "vert", "vim", "vue", "wgsl", "xml", "xsd", "xsl", "xslt", "yaml", "yml", "zig", "zsh"
]);

const TEXT_FILE_NAMES = new Set([
    ".bash_profile", ".bashrc", ".dockerignore", ".editorconfig", ".env", ".eslintignore", ".eslintrc", ".gitattributes", ".gitconfig", ".gitignore", ".gitkeep", ".npmrc", ".prettierrc", ".profile", ".vimrc", ".zprofile", ".zshrc",
    "brewfile", "cmakelists.txt", "dockerfile", "gemfile", "license", "makefile", "podfile", "procfile", "rakefile", "readme", "vagrantfile"
]);

const TEXT_FILE_SUFFIXES = [
    ".babelrc", ".browserslistrc", ".css.map", ".d.ts", ".env.development", ".env.example", ".env.local", ".env.production", ".env.test", ".html.j2", ".js.map", ".module.css", ".module.scss", ".mtsx", ".spec.ts", ".spec.tsx", ".stories.tsx", ".test.ts", ".test.tsx"
];

const BINARY_FILE_EXTENSIONS = new Set([
    "7z", "a", "aac", "apk", "app", "ar", "avi", "bin", "bmp", "bz2",
    "class", "deb", "dll", "dmg", "doc", "docm", "docx", "dylib",
    "eot", "exe", "flac", "gif", "gz", "heic", "heif", "ico", "iso",
    "jar", "jpeg", "jpg", "m4a", "m4v", "mov", "mp3", "mp4", "mpeg",
    "mpg", "msi", "o", "obj", "odf", "ods", "odt", "ogg", "ogv", "otf",
    "pdf", "png", "ppt", "pptx", "pyc", "rar", "rpm", "so", "sqlite",
    "sqlite3", "tar", "tgz", "ttf", "wasm", "wav", "webm", "webp", "woff",
    "woff2", "xls", "xlsm", "xlsx", "xz", "zip"
]);

const TEXT_MIME_TYPES: Record<string, string> = {
    css: "text/css",
    csv: "text/csv",
    htm: "text/html",
    html: "text/html",
    js: "text/javascript",
    json: "application/json",
    json5: "application/json",
    jsonc: "application/json",
    jsx: "text/javascript",
    md: "text/markdown",
    mdx: "text/markdown",
    mjs: "text/javascript",
    toml: "application/toml",
    ts: "text/typescript",
    tsx: "text/typescript",
    txt: "text/plain",
    xml: "application/xml",
    yaml: "application/yaml",
    yml: "application/yaml"
};

function getFileBasename(filename: string) {
    return filename
        .split(/[\\/]/)
        .pop()
        ?.split(/[?#]/)[0]
        ?.toLowerCase()
        ?? "";
}

function getFilenameExtension(filename: string) {
    const name = getFileBasename(filename);
    const dotIndex = name.lastIndexOf(".");
    return dotIndex === -1 ? "" : name.slice(dotIndex + 1);
}

function isSupportedFilename(filename: string) {
    const name = getFileBasename(filename);
    if (!name) return false;
    if (TEXT_FILE_NAMES.has(name) || TEXT_FILE_SUFFIXES.some(suffix => name.endsWith(suffix))) return true;

    const ext = getFilenameExtension(name);
    if (!ext) return true;
    if (TEXT_FILE_EXTENSIONS.has(ext)) return true;

    return !BINARY_FILE_EXTENSIONS.has(ext);
}

function inferLanguage(filename: string, rawText: string) {
    const name = getFileBasename(filename);
    const ext = getFilenameExtension(name);

    const langNameMap: Record<string, string> = {
        ".babelrc": "json",
        ".bash_profile": "bash",
        ".bashrc": "bash",
        ".dockerignore": "gitignore",
        ".editorconfig": "ini",
        ".env": "dotenv",
        ".eslintignore": "gitignore",
        ".eslintrc": "json",
        ".gitattributes": "git-attributes",
        ".gitconfig": "ini",
        ".gitignore": "gitignore",
        ".npmrc": "ini",
        ".prettierrc": "json",
        ".profile": "bash",
        ".vimrc": "vim",
        ".zprofile": "zsh",
        ".zshrc": "zsh",
        "brewfile": "ruby",
        "cmakelists.txt": "cmake",
        "dockerfile": "dockerfile",
        "gemfile": "ruby",
        "makefile": "make",
        "podfile": "ruby",
        "procfile": "bash",
        "rakefile": "ruby",
        "vagrantfile": "ruby"
    };

    const fromName = langNameMap[name];
    if (fromName) return fromName;
    if (name.endsWith(".d.ts")) return "typescript";
    if (name.endsWith(".css.map") || name.endsWith(".js.map")) return "json";
    if (name.endsWith(".env.local") || name.endsWith(".env.development") || name.endsWith(".env.production") || name.endsWith(".env.test") || name.endsWith(".env.example")) return "dotenv";

    const langMap: Record<string, string> = {
        "1": "man",
        "2": "man",
        "3": "man",
        "4": "man",
        "5": "man",
        "6": "man",
        "7": "man",
        "8": "man",
        "9": "man",
        adoc: "asciidoc",
        asc: "text",
        asm: "asm",
        astro: "astro",
        awk: "awk",
        bash: "bash",
        bat: "batch",
        bats: "bash",
        bib: "bibtex",
        blade: "blade",
        c: "c",
        cabal: "haskell",
        cc: "cpp",
        cfg: "ini",
        clj: "clojure",
        cljs: "clojure",
        cmake: "cmake",
        cmd: "batch",
        conf: "ini",
        config: "ini",
        cpp: "cpp",
        cs: "csharp",
        csh: "shellscript",
        css: "css",
        csv: "csv",
        cts: "typescript",
        dart: "dart",
        diff: "diff",
        dockerfile: "dockerfile",
        dtd: "xml",
        editorconfig: "ini",
        env: "dotenv",
        erl: "erlang",
        ex: "elixir",
        exs: "elixir",
        fish: "fish",
        frag: "glsl",
        fs: "fsharp",
        fsi: "fsharp",
        fsx: "fsharp",
        gemspec: "ruby",
        gitconfig: "ini",
        gitignore: "gitignore",
        gleam: "gleam",
        glsl: "glsl",
        go: "go",
        gql: "graphql",
        gradle: "groovy",
        graphql: "graphql",
        groovy: "groovy",
        h: "c",
        handlebars: "handlebars",
        hbs: "handlebars",
        heex: "elixir",
        hh: "cpp",
        hpp: "cpp",
        hrl: "erlang",
        hs: "haskell",
        htm: "html",
        html: "html",
        http: "http",
        hxx: "cpp",
        ics: "text",
        ignore: "gitignore",
        ini: "ini",
        java: "java",
        jl: "julia",
        js: "javascript",
        json: "json",
        json5: "json5",
        jsonc: "jsonc",
        jsx: "jsx",
        kdl: "kdl",
        kt: "kotlin",
        kts: "kotlin",
        less: "less",
        lhs: "haskell",
        liquid: "liquid",
        lock: "text",
        log: "log",
        lua: "lua",
        m: "objective-c",
        make: "make",
        markdown: "markdown",
        md: "markdown",
        mdx: "mdx",
        mjs: "javascript",
        mk: "make",
        mkd: "markdown",
        ml: "ocaml",
        mli: "ocaml",
        mts: "typescript",
        mustache: "handlebars",
        nix: "nix",
        patch: "diff",
        php: "php",
        pl: "perl",
        plist: "xml",
        pm: "perl",
        pp: "puppet",
        properties: "properties",
        proto: "proto",
        ps1: "powershell",
        psd1: "powershell",
        psm1: "powershell",
        pug: "pug",
        py: "python",
        pyi: "python",
        pyw: "python",
        r: "r",
        rb: "ruby",
        rego: "rego",
        res: "rescript",
        resi: "rescript",
        rs: "rust",
        rss: "xml",
        rst: "rst",
        sass: "sass",
        scala: "scala",
        scss: "scss",
        sh: "bash",
        sln: "ini",
        sol: "solidity",
        sql: "sql",
        srt: "text",
        styl: "stylus",
        svelte: "svelte",
        swift: "swift",
        tf: "terraform",
        tfvars: "terraform",
        toml: "toml",
        ts: "typescript",
        tsx: "tsx",
        txt: "log",
        v: "verilog",
        vb: "vb",
        vbs: "vb",
        vert: "glsl",
        vim: "vim",
        vue: "vue",
        wgsl: "wgsl",
        xml: "xml",
        xsd: "xml",
        xsl: "xml",
        xslt: "xml",
        yaml: "yaml",
        yml: "yaml",
        zig: "zig",
        zsh: "zsh",
    };

    const fromExt = langMap[ext];
    if (fromExt && fromExt !== "text") return fromExt;

    const trimmed = rawText.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            JSON.parse(trimmed);
            return "json";
        } catch { }
    }

    if (trimmed.startsWith("<") && trimmed.includes(">")) return "xml";
    if (rawText.includes("Traceback (most recent call last):")) return "python";

    return fromExt ?? "text";
}

function withLineNumbers(rawText: string, lineCount: number) {
    const width = Math.max(3, lineCount.toString().length);
    const lines = rawText.split("\n");
    // Avoid adding an artificial numbered empty line when the file ends with a trailing newline.
    if (lines.length > 1 && lines[lines.length - 1] === "") {
        lines.pop();
    }

    return lines
        .map((line, idx) => `${(idx + 1).toString().padStart(width, " ")} | ${line}`)
        .join("\n");
}

function getLineCount(rawText: string) {
    return rawText.split("\n").length;
}

function getTextMimeType(filename: string) {
    return TEXT_MIME_TYPES[getFilenameExtension(filename)] ?? "text/plain";
}

type ShortcutSpec = {
    alt: boolean;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
    key: string;
};

type ShikiToken = {
    color?: string;
    content: string;
    fontStyle?: number;
};

type ShikiPluginApi = {
    renderHighlighter?: (args: { lang: string, content: string; }) => ReactNode;
    shiki?: {
        tokenizeCode?: (content: string, lang: string) => Promise<ShikiToken[][]>;
    };
};

function getShikiPlugin() {
    return Vencord?.Plugins?.plugins?.ShikiCodeblocks as ShikiPluginApi | undefined;
}

function normalizeShortcutKey(key: string) {
    const lower = key.trim().toLowerCase();
    if (lower === "return") return "enter";
    if (lower === "esc") return "escape";
    if (lower === "spacebar" || lower === " ") return "space";
    return lower;
}

function parseShortcut(shortcut: string): ShortcutSpec | null {
    const parts = shortcut
        .split("+")
        .map(part => part.trim())
        .filter(Boolean);
    if (!parts.length) return null;

    const spec: ShortcutSpec = {
        alt: false,
        ctrl: false,
        meta: false,
        shift: false,
        key: ""
    };

    for (const part of parts) {
        const key = normalizeShortcutKey(part);
        if (key === "ctrl" || key === "control") spec.ctrl = true;
        else if (key === "cmd" || key === "command" || key === "meta") spec.meta = true;
        else if (key === "alt" || key === "option") spec.alt = true;
        else if (key === "shift") spec.shift = true;
        else if (!spec.key) spec.key = key;
        else return null;
    }

    return spec.key ? spec : null;
}

function eventMatchesShortcut(event: KeyboardEvent, shortcut: string, allowExtraShift = false) {
    const spec = parseShortcut(shortcut);
    if (!spec) return false;

    const key = normalizeShortcutKey(event.key);
    const shiftMatches = event.shiftKey === spec.shift || (allowExtraShift && event.shiftKey && !spec.shift);

    return key === spec.key
        && event.altKey === spec.alt
        && event.ctrlKey === spec.ctrl
        && event.metaKey === spec.meta
        && shiftMatches;
}

async function saveFileToComputer(filename: string, fileText: string) {
    const safeFilename = filename || t("defaultFilename");
    const blob = new Blob([fileText], { type: getTextMimeType(safeFilename) });

    try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = safeFilename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
        showToast(t("toast.downloadStarted"), Toasts.Type.SUCCESS);
        return true;
    } catch (err) {
        console.error("[FullLogViewer] Failed to download edited file", err);
        showToast(t("toast.saveFailed"), Toasts.Type.FAILURE);
        return false;
    }
}

function dispatchBestEffortSend() {
    window.setTimeout(() => {
        ComponentDispatch?.dispatchToLastSubscribed?.("SEND_MESSAGE");
        ComponentDispatch?.dispatch?.("SEND_MESSAGE");

        const textbox = document.querySelector<HTMLElement>("[role='textbox'][contenteditable='true'], [data-slate-editor='true']");
        textbox?.dispatchEvent(new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            code: "Enter",
            key: "Enter"
        }));
    }, 350);
}

function attachFileToCurrentChannel(filename: string, fileText: string, sendImmediately = false) {
    const channelId = SelectedChannelStore.getChannelId();
    const channel = channelId ? ChannelStore.getChannel(channelId) : null;

    if (!channel) {
        showToast(t("toast.attachNoChannel"), Toasts.Type.FAILURE);
        return false;
    }

    const uploadFile = new File([fileText], filename || t("defaultFilename"), { type: getTextMimeType(filename) });

    try {
        UploadHandler.promptToUpload([uploadFile], channel, DraftType.ChannelMessage);
        if (sendImmediately) {
            dispatchBestEffortSend();
            showToast(t("toast.attachAndSendAttempted"), Toasts.Type.SUCCESS);
        } else {
            showToast(t("toast.attachAdded"), Toasts.Type.SUCCESS);
        }
        return true;
    } catch (err) {
        console.error("[FullLogViewer] Failed to attach edited file", err);
        showToast(t("toast.attachFailed"), Toasts.Type.FAILURE);
        return false;
    }
}

function clearSearchHighlights(root: HTMLElement) {
    const marks = root.querySelectorAll("mark.vc-log-search-hit");
    marks.forEach(mark => {
        const text = document.createTextNode(mark.textContent ?? "");
        mark.replaceWith(text);
    });

    root.normalize();
}

function applySearchHighlight(root: HTMLElement, query: string, maxMatches = Number.POSITIVE_INFINITY) {
    clearSearchHighlights(root);
    if (!query) return [] as HTMLElement[];

    const lowerQuery = query.toLowerCase();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    const marks: HTMLElement[] = [];

    while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (!node.nodeValue || !node.nodeValue.trim()) continue;
        nodes.push(node);
    }

    for (const textNode of nodes) {
        if (marks.length >= maxMatches) break;
        const source = textNode.nodeValue ?? "";
        const lower = source.toLowerCase();
        let start = 0;
        let idx = lower.indexOf(lowerQuery, start);
        if (idx === -1) continue;

        const frag = document.createDocumentFragment();
        while (idx !== -1) {
            if (marks.length >= maxMatches) break;
            if (idx > start) frag.appendChild(document.createTextNode(source.slice(start, idx)));
            const mark = document.createElement("mark");
            mark.className = "vc-log-search-hit";
            mark.style.background = "#f7cc4a";
            mark.style.color = "#1a1a1a";
            mark.textContent = source.slice(idx, idx + query.length);
            frag.appendChild(mark);
            marks.push(mark);

            start = idx + query.length;
            idx = lower.indexOf(lowerQuery, start);
        }

        if (start < source.length) frag.appendChild(document.createTextNode(source.slice(start)));
        textNode.replaceWith(frag);
    }

    return marks;
}

function getSearchRoots(root: HTMLElement) {
    const shikiCodeCells = root.querySelectorAll<HTMLElement>(".vc-shiki-table-row > .vc-shiki-table-cell:nth-child(2)");
    return shikiCodeCells.length ? Array.from(shikiCodeCells) : [root];
}

type SearchSegment = { node: Text; start: number; end: number; };
type SearchIndex = {
    lowerText: string;
    segments: SearchSegment[];
};

function buildSearchIndex(root: HTMLElement): SearchIndex {
    const segments: SearchSegment[] = [];
    let combinedText = "";

    for (const searchRoot of getSearchRoots(root)) {
        if (combinedText) combinedText += "\n";

        const walker = document.createTreeWalker(searchRoot, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            const value = node.nodeValue ?? "";
            if (!value) continue;

            const start = combinedText.length;
            combinedText += value;
            segments.push({ node, start, end: combinedText.length });
        }
    }

    return {
        lowerText: combinedText.toLowerCase(),
        segments
    };
}

function findSegmentForOffset(segments: SearchSegment[], offset: number) {
    let low = 0;
    let high = segments.length - 1;

    while (low <= high) {
        const mid = (low + high) >> 1;
        const segment = segments[mid];

        if (offset < segment.start) {
            high = mid - 1;
        } else if (offset > segment.end) {
            low = mid + 1;
        } else {
            return segment;
        }
    }

    return null;
}

function findSearchRanges(searchIndex: SearchIndex, query: string, maxMatches = Number.POSITIVE_INFINITY) {
    if (!query) return [] as Range[];

    const lowerQuery = query.toLowerCase();
    const ranges: Range[] = [];
    let start = 0;
    let idx = searchIndex.lowerText.indexOf(lowerQuery, start);

    while (idx !== -1 && ranges.length < maxMatches) {
        const end = idx + query.length;
        const startSegment = findSegmentForOffset(searchIndex.segments, idx);
        const endSegment = findSegmentForOffset(searchIndex.segments, end);

        if (startSegment && endSegment) {
            const range = document.createRange();
            range.setStart(startSegment.node, idx - startSegment.start);
            range.setEnd(endSegment.node, end - endSegment.start);
            ranges.push(range);
        }

        start = end;
        idx = searchIndex.lowerText.indexOf(lowerQuery, start);
    }

    return ranges;
}

function canUseCssHighlights() {
    return Boolean((CSS as unknown as { highlights?: Map<string, unknown>; }).highlights && (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown; }).Highlight);
}

function clearCssSearchHighlights(hitName: string, activeName: string) {
    const { highlights } = CSS as unknown as { highlights?: Map<string, unknown>; };
    highlights?.delete(hitName);
    highlights?.delete(activeName);
}

function setCssSearchHighlights(hitName: string, activeName: string, ranges: Range[], activeIndex: number) {
    const { highlights } = CSS as unknown as { highlights?: Map<string, unknown>; };
    const { Highlight: HighlightCtor } = window as unknown as { Highlight?: new (...ranges: Range[]) => unknown; };
    if (!highlights || !HighlightCtor) return false;

    const safeActiveIndex = activeIndex >= 0 && activeIndex < ranges.length ? activeIndex : -1;
    const regularRanges = safeActiveIndex === -1
        ? ranges
        : ranges.filter((_, i) => i !== safeActiveIndex);
    const activeRanges = safeActiveIndex === -1 ? [] : [ranges[safeActiveIndex]];

    highlights.set(hitName, new HighlightCtor(...regularRanges));
    highlights.set(activeName, new HighlightCtor(...activeRanges));
    return true;
}

function openLogModal(
    filename: string,
    rawText: string,
    manualPerformanceMode: boolean | null = null,
    onManualPerformanceModeChange?: (value: boolean | null) => void
) {
    const {
        actionDisplayMode,
        allowManualPerformanceToggleInViewer,
        autoCloseViewer,
        autoPerformanceCharThreshold: autoCharThreshold,
        autoPerformanceLineThreshold: autoLineThreshold,
        autoPerformanceMode: autoPerfEnabled,
        closeOnShift,
        enableInsertAction,
        enableInsertAndSendAction,
        enablePerformanceMode: performanceModeEnabled,
        enableSaveAction,
        enableShikiColoring: showShiki,
        forceShikiInPerformanceMode,
        insertAndSendShortcut,
        insertShortcut,
        saveShortcut,
        showEditorLineNumbers,
        useShikiInEditMode
    } = settings.store;

    const autoPerformanceMode = performanceModeEnabled && autoPerfEnabled;
    let currentText = rawText;
    let isEditing = false;
    let editor: HTMLTextAreaElement | null = null;
    let editorHighlightLayer: HTMLElement | null = null;
    let editorLineNumberLayer: HTMLElement | null = null;
    let editorLayerRenderId = 0;
    let renderRoot: Root | null = null;
    let searchableRoot: HTMLElement | null = null;
    let searchIndex: SearchIndex | null = null;
    let currentMatches: HTMLElement[] = [];
    let currentRangeMatches: Range[] = [];
    let editorMatches: Array<{ start: number; end: number; }> = [];
    let activeMatchIndex = -1;
    let searchDebounce: number | null = null;
    let useRangeSearch = false;
    let didCleanup = false;
    let isSavingFile = false;
    const shikiCharLimit = 120_000;
    const highlightId = Math.random().toString(36).slice(2);
    const cssHitHighlightName = `vc-log-search-hit-${highlightId}`;
    const cssActiveHighlightName = `vc-log-search-active-${highlightId}`;

    const bgPrimary = "var(--background-primary, #1e1f22)";
    const bgSecondary = "var(--background-secondary, #2b2d31)";
    const bgTertiary = "var(--background-tertiary, #313338)";
    const borderColor = "var(--background-modifier-accent, #4e5058)";
    const textNormal = "var(--text-normal, #dbdee1)";
    const textMuted = "var(--text-muted, #b5bac1)";
    const buttonSecondary = "var(--button-secondary-background, #4e5058)";
    const buttonDanger = "var(--button-danger-background, #da373c)";
    const initialLineCount = getLineCount(currentText);

    const existing = document.getElementById("vc-full-log-viewer-modal");
    if (existing) {
        (existing as { vcCleanup?: () => void; }).vcCleanup?.();
        existing.remove();
    }

    const cssHighlightStyle = document.createElement("style");
    cssHighlightStyle.textContent = `
::highlight(${cssHitHighlightName}) {
    background-color: #f7cc4a;
    color: #1a1a1a;
}
::highlight(${cssActiveHighlightName}) {
    background-color: #ff9800;
    color: #111;
}
`;
    document.head.appendChild(cssHighlightStyle);

    const overlay = document.createElement("div");
    overlay.id = "vc-full-log-viewer-modal";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.75)";
    overlay.style.zIndex = "999999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";

    const box = document.createElement("div");
    box.style.width = "min(95vw, 1500px)";
    box.style.height = "min(92vh, 1000px)";
    box.style.background = bgPrimary;
    box.style.border = `1px solid ${borderColor}`;
    box.style.borderRadius = "12px";
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.overflow = "hidden";
    box.style.boxShadow = (
        performanceModeEnabled && (
            autoPerformanceMode
                ? currentText.length > autoCharThreshold || initialLineCount > autoLineThreshold
                : true
        ) && manualPerformanceMode !== false
    ) ? "none" : "0 20px 60px rgba(0,0,0,0.45)";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.gap = "8px";
    header.style.alignItems = "center";
    header.style.padding = "12px";
    header.style.borderBottom = `1px solid ${borderColor}`;
    header.style.background = bgSecondary;

    const title = document.createElement("div");
    title.textContent = filename;
    title.style.fontWeight = "700";
    title.style.flex = "1";

    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = t("viewer.search.placeholder");
    search.style.width = "260px";
    search.style.padding = "8px 10px";
    search.style.borderRadius = "8px";
    search.style.border = `1px solid ${borderColor}`;
    search.style.background = bgTertiary;
    search.style.color = textNormal;
    search.style.outline = "none";
    search.style.minWidth = "220px";

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "▲";
    prevBtn.title = t("viewer.search.previous");
    prevBtn.style.padding = "8px 10px";
    prevBtn.style.borderRadius = "8px";
    prevBtn.style.border = "none";
    prevBtn.style.cursor = "pointer";
    prevBtn.style.background = buttonSecondary;
    prevBtn.style.color = textNormal;
    prevBtn.disabled = true;

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "▼";
    nextBtn.title = t("viewer.search.next");
    nextBtn.style.padding = "8px 10px";
    nextBtn.style.borderRadius = "8px";
    nextBtn.style.border = "none";
    nextBtn.style.cursor = "pointer";
    nextBtn.style.background = buttonSecondary;
    nextBtn.style.color = textNormal;
    nextBtn.disabled = true;

    const copyBtn = document.createElement("button");
    copyBtn.textContent = t("viewer.copyAll");
    copyBtn.style.padding = "8px 12px";
    copyBtn.style.borderRadius = "8px";
    copyBtn.style.border = "none";
    copyBtn.style.cursor = "pointer";
    copyBtn.style.background = buttonSecondary;
    copyBtn.style.color = textNormal;
    copyBtn.onclick = async () => {
        await copyWithToast(isEditing ? (editor?.value ?? currentText) : currentText, t("toast.copied"));
    };

    const editBtn = document.createElement("button");
    editBtn.textContent = t("viewer.editFile");
    editBtn.style.padding = "8px 12px";
    editBtn.style.borderRadius = "8px";
    editBtn.style.border = "none";
    editBtn.style.cursor = "pointer";
    editBtn.style.background = buttonSecondary;
    editBtn.style.color = textNormal;

    const closeEditBtn = document.createElement("button");
    closeEditBtn.textContent = t("viewer.cancelEdit");
    closeEditBtn.title = t("viewer.cancelEdit.title");
    closeEditBtn.style.padding = "8px 12px";
    closeEditBtn.style.borderRadius = "8px";
    closeEditBtn.style.border = "none";
    closeEditBtn.style.cursor = "pointer";
    closeEditBtn.style.background = buttonDanger;
    closeEditBtn.style.color = textNormal;
    closeEditBtn.style.display = "none";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "X";
    closeBtn.title = t("viewer.close");
    closeBtn.style.width = "36px";
    closeBtn.style.height = "32px";
    closeBtn.style.padding = "0";
    closeBtn.style.borderRadius = "6px";
    closeBtn.style.border = "none";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.background = "transparent";
    closeBtn.style.color = textNormal;
    closeBtn.style.fontSize = "22px";
    closeBtn.style.lineHeight = "32px";
    closeBtn.style.display = "inline-flex";
    closeBtn.style.alignItems = "center";
    closeBtn.style.justifyContent = "center";
    closeBtn.onmouseenter = () => {
        closeBtn.style.background = buttonDanger;
        closeBtn.style.color = "white";
    };
    closeBtn.onmouseleave = () => {
        closeBtn.style.background = "transparent";
        closeBtn.style.color = textNormal;
    };

    const perfToggleBtn = document.createElement("button");
    perfToggleBtn.textContent = t("viewer.performance.off");
    perfToggleBtn.style.padding = "8px 12px";
    perfToggleBtn.style.borderRadius = "8px";
    perfToggleBtn.style.border = "none";
    perfToggleBtn.style.cursor = "pointer";
    perfToggleBtn.style.background = buttonSecondary;
    perfToggleBtn.style.color = textNormal;

    const makeActionButton = (label: string) => {
        const button = document.createElement("button");
        button.textContent = label;
        button.style.padding = "8px 12px";
        button.style.borderRadius = "8px";
        button.style.border = "none";
        button.style.cursor = "pointer";
        button.style.background = buttonSecondary;
        button.style.color = textNormal;
        return button;
    };

    const insertActionBtn = makeActionButton(t("viewer.action.insert.short"));
    insertActionBtn.title = t("viewer.action.insert.title", { shortcut: insertShortcut });
    const insertAndSendActionBtn = makeActionButton(t("viewer.action.insertAndSend.short"));
    insertAndSendActionBtn.title = t("viewer.action.insertAndSend.title", { shortcut: insertAndSendShortcut });
    const saveActionBtn = makeActionButton(t("viewer.action.save.short"));
    saveActionBtn.title = t("viewer.action.save.title", { shortcut: saveShortcut });

    const actionsWrap = document.createElement("div");
    actionsWrap.style.position = "relative";
    actionsWrap.style.display = "inline-flex";

    const actionsMenuBtn = makeActionButton(t("viewer.actions"));
    const actionsDropdown = document.createElement("div");
    actionsDropdown.style.position = "absolute";
    actionsDropdown.style.top = "calc(100% + 6px)";
    actionsDropdown.style.right = "0";
    actionsDropdown.style.minWidth = "220px";
    actionsDropdown.style.padding = "6px";
    actionsDropdown.style.border = `1px solid ${borderColor}`;
    actionsDropdown.style.borderRadius = "8px";
    actionsDropdown.style.background = bgSecondary;
    actionsDropdown.style.boxShadow = "0 12px 30px rgba(0,0,0,0.35)";
    actionsDropdown.style.display = "none";
    actionsDropdown.style.zIndex = "1";

    const makeMenuItem = (label: string) => {
        const button = document.createElement("button");
        button.textContent = label;
        button.style.display = "block";
        button.style.width = "100%";
        button.style.padding = "8px 10px";
        button.style.borderRadius = "6px";
        button.style.border = "none";
        button.style.textAlign = "left";
        button.style.cursor = "pointer";
        button.style.background = "transparent";
        button.style.color = textNormal;
        button.onmouseenter = () => {
            button.style.background = bgTertiary;
        };
        button.onmouseleave = () => {
            button.style.background = "transparent";
        };
        return button;
    };

    const insertMenuItem = makeMenuItem(t("action.insert"));
    const insertAndSendMenuItem = makeMenuItem(t("action.insertAndSend"));
    const saveMenuItem = makeMenuItem(t("action.save"));
    actionsMenuBtn.onclick = e => {
        e.stopPropagation();
        actionsDropdown.style.display = actionsDropdown.style.display === "none" ? "block" : "none";
    };

    const stats = document.createElement("div");
    stats.style.padding = "8px 12px";
    stats.style.fontSize = "12px";
    stats.style.color = textMuted;
    stats.style.borderBottom = `1px solid ${borderColor}`;
    stats.textContent = "";

    const content = document.createElement("div");
    content.style.flex = "1";
    content.style.overflow = "auto";
    content.style.padding = "14px";
    content.style.background = bgPrimary;
    content.style.userSelect = "text";
    content.style.setProperty("-webkit-user-select", "text");
    content.style.cursor = "text";

    const scrollEditorToOffset = (offset: number) => {
        if (!editor) return;

        const beforeMatch = editor.value.slice(0, offset);
        const lineCountBeforeMatch = beforeMatch.split("\n").length - 1;
        const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 17.4;
        editor.scrollTop = Math.max(0, (lineCountBeforeMatch * lineHeight) - (editor.clientHeight / 2));
    };

    const focusMatch = (index: number, focusEditor = true) => {
        const matchCount = isEditing ? editorMatches.length : useRangeSearch ? currentRangeMatches.length : currentMatches.length;
        if (!matchCount) return;
        const safeIndex = ((index % matchCount) + matchCount) % matchCount;
        activeMatchIndex = safeIndex;

        if (isEditing && editor) {
            const match = editorMatches[safeIndex];
            if (focusEditor) editor.focus();
            editor.setSelectionRange(match.start, match.start);
            scrollEditorToOffset(match.start);
            paintEditorHighlights(editor.value, search.value.trim(), true);
            return;
        }

        if (useRangeSearch) {
            const range = currentRangeMatches[safeIndex];
            if (canUseCssHighlights()) {
                setCssSearchHighlights(cssHitHighlightName, cssActiveHighlightName, currentRangeMatches, safeIndex);
            } else {
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            }
            range.startContainer.parentElement?.scrollIntoView({ behavior: "auto", block: "center" });
            return;
        }

        currentMatches.forEach((m, i) => {
            if (i === safeIndex) {
                m.style.background = "#ff9800";
                m.style.color = "#111";
            } else {
                m.style.background = "#f7cc4a";
                m.style.color = "#1a1a1a";
            }
        });

        currentMatches[safeIndex]?.scrollIntoView({ behavior: "auto", block: "center" });
    };

    const getWorkingText = () => isEditing ? (editor?.value ?? currentText) : currentText;

    const updateEditorMatches = (text: string) => {
        editorMatches = [];

        const { maxHighlightedMatches, minSearchLength } = getPerformanceState(text);
        const query = search.value.trim();
        const shouldSearch = query.length >= minSearchLength;

        if (shouldSearch) {
            const lowerText = text.toLowerCase();
            const lowerQuery = query.toLowerCase();
            let start = 0;
            let idx = lowerText.indexOf(lowerQuery, start);

            while (idx !== -1 && editorMatches.length < maxHighlightedMatches) {
                editorMatches.push({ start: idx, end: idx + query.length });
                start = idx + query.length;
                idx = lowerText.indexOf(lowerQuery, start);
            }
        }

        if (editorMatches.length > 0) {
            const selectionStart = editor?.selectionStart ?? 0;
            const currentIndex = editorMatches.findIndex(match => selectionStart >= match.start && selectionStart <= match.end);
            activeMatchIndex = currentIndex === -1 ? 0 : currentIndex;
        } else {
            activeMatchIndex = -1;
        }

        return { query, shouldSearch };
    };

    const paintEditorLineNumbers = (text: string) => {
        if (!editorLineNumberLayer || !editor || !editorHighlightLayer) return;

        if (!showEditorLineNumbers) {
            editorLineNumberLayer.style.display = "none";
            editorHighlightLayer.style.paddingLeft = "14px";
            editor.style.paddingLeft = "14px";
            return;
        }

        const lineCount = getLineCount(text);
        const width = `${Math.max(3, lineCount.toString().length) + 2}ch`;
        editorLineNumberLayer.style.display = "block";
        editorLineNumberLayer.style.width = width;
        editorLineNumberLayer.textContent = Array.from({ length: lineCount }, (_, idx) => String(idx + 1)).join("\n");
        editorHighlightLayer.style.paddingLeft = `calc(${width} + 14px)`;
        editor.style.paddingLeft = `calc(${width} + 14px)`;
    };

    const appendEditorText = (
        parent: HTMLElement,
        text: string,
        startOffset: number,
        style: Partial<CSSStyleDeclaration> = {}
    ) => {
        const endOffset = startOffset + text.length;
        let cursor = 0;

        for (let i = 0; i < editorMatches.length; i++) {
            const match = editorMatches[i];
            if (match.end <= startOffset) continue;
            if (match.start >= endOffset) break;

            const matchStart = Math.max(match.start - startOffset, 0);
            const matchEnd = Math.min(match.end - startOffset, text.length);
            if (matchStart > cursor) {
                const span = document.createElement("span");
                Object.assign(span.style, style);
                span.textContent = text.slice(cursor, matchStart);
                parent.appendChild(span);
            }

            const span = document.createElement("span");
            Object.assign(span.style, style);
            span.style.background = i === activeMatchIndex ? "#ff9800" : "#f7cc4a";
            span.style.color = "#1a1a1a";
            span.textContent = text.slice(matchStart, matchEnd);
            parent.appendChild(span);
            cursor = matchEnd;
        }

        if (cursor < text.length) {
            const span = document.createElement("span");
            Object.assign(span.style, style);
            span.textContent = text.slice(cursor);
            parent.appendChild(span);
        }
    };

    const paintPlainEditorLayer = (text: string, shouldSearch: boolean) => {
        if (!editorHighlightLayer) return;

        editorHighlightLayer.replaceChildren();
        paintEditorLineNumbers(text);

        if (!shouldSearch || editorMatches.length === 0) {
            editorHighlightLayer.textContent = text || " ";
            return;
        }

        let cursor = 0;
        for (let i = 0; i < editorMatches.length; i++) {
            const match = editorMatches[i];
            if (match.start > cursor) {
                editorHighlightLayer.appendChild(document.createTextNode(text.slice(cursor, match.start)));
            }

            const span = document.createElement("span");
            span.textContent = text.slice(match.start, match.end);
            span.style.background = i === activeMatchIndex ? "#ff9800" : "#f7cc4a";
            span.style.color = "#1a1a1a";
            editorHighlightLayer.appendChild(span);
            cursor = match.end;
        }

        if (cursor < text.length) {
            editorHighlightLayer.appendChild(document.createTextNode(text.slice(cursor)));
        }

        if (text.endsWith("\n")) {
            editorHighlightLayer.appendChild(document.createTextNode(" "));
        }
    };

    const paintEditorHighlights = (text: string, query: string, shouldSearch: boolean) => {
        void query;
        paintPlainEditorLayer(text, shouldSearch);

        const { isPerformanceMode } = getPerformanceState(text);
        const canUseShikiInEditor = Boolean(
            showShiki
            && useShikiInEditMode
            && Vencord?.Plugins?.isPluginEnabled?.("ShikiCodeblocks")
            && getShikiPlugin()?.shiki?.tokenizeCode
            && (!isPerformanceMode || forceShikiInPerformanceMode)
            && (forceShikiInPerformanceMode || text.length <= shikiCharLimit)
        );
        if (!canUseShikiInEditor || !editorHighlightLayer) return;

        const renderId = ++editorLayerRenderId;
        const lang = inferLanguage(filename, text);
        void getShikiPlugin()?.shiki?.tokenizeCode?.(text, lang).then(tokens => {
            if (renderId !== editorLayerRenderId || !editorHighlightLayer) return;

            editorHighlightLayer.replaceChildren();
            paintEditorLineNumbers(text);

            let offset = 0;
            tokens.forEach((line, lineIndex) => {
                if (!line.length) {
                    editorHighlightLayer!.appendChild(document.createTextNode("\n"));
                    offset += 1;
                    return;
                }

                for (const token of line) {
                    appendEditorText(editorHighlightLayer!, token.content, offset, {
                        color: token.color,
                        fontStyle: (token.fontStyle ?? 0) & 1 ? "italic" : "",
                        fontWeight: (token.fontStyle ?? 0) & 2 ? "700" : "",
                        textDecoration: (token.fontStyle ?? 0) & 4 ? "underline" : ""
                    });
                    offset += token.content.length;
                }

                if (lineIndex < tokens.length - 1) {
                    editorHighlightLayer!.appendChild(document.createTextNode("\n"));
                    offset += 1;
                }
            });

            if (!tokens.length) editorHighlightLayer.textContent = text || " ";
        }).catch(err => {
            console.error("[FullLogViewer] Failed to render editor Shiki layer", err);
        });
    };

    const getPerformanceState = (text: string) => {
        const lineCount = getLineCount(text);
        const autoDetectedPerformanceMode = performanceModeEnabled && (
            autoPerformanceMode
                ? text.length > autoCharThreshold || lineCount > autoLineThreshold
                : true
        );
        const isPerformanceMode = performanceModeEnabled && (manualPerformanceMode ?? autoDetectedPerformanceMode);
        const useLowGpuMode = isPerformanceMode;
        const maxHighlightedMatches = isPerformanceMode ? 250 : 2_500;
        const minSearchLength = isPerformanceMode ? 2 : 1;

        return {
            isPerformanceMode,
            lineCount,
            maxHighlightedMatches,
            minSearchLength,
            useLowGpuMode
        };
    };

    const updateButtons = () => {
        editBtn.textContent = t("viewer.editFile");
        editBtn.style.background = buttonSecondary;
        editBtn.title = t("viewer.editFile");
        editBtn.style.display = isEditing ? "none" : "inline-block";
        closeEditBtn.style.display = isEditing ? "inline-block" : "none";
        search.disabled = false;
        const query = search.value.trim();
        const { minSearchLength } = getPerformanceState(getWorkingText());
        const isSearchActive = query.length >= minSearchLength;
        const matchCount = isEditing ? editorMatches.length : useRangeSearch ? currentRangeMatches.length : currentMatches.length;
        prevBtn.style.display = isSearchActive ? "inline-block" : "none";
        nextBtn.style.display = isSearchActive ? "inline-block" : "none";
        prevBtn.disabled = matchCount === 0;
        nextBtn.disabled = matchCount === 0;

        const { isPerformanceMode } = getPerformanceState(getWorkingText());
        perfToggleBtn.textContent = isPerformanceMode ? t("viewer.performance.on") : t("viewer.performance.off");
        perfToggleBtn.style.display = isEditing ? "none" : "inline-block";

        insertActionBtn.style.display = isEditing && enableInsertAction && actionDisplayMode === ACTION_DISPLAY_BUTTONS ? "inline-block" : "none";
        insertAndSendActionBtn.style.display = isEditing && enableInsertAndSendAction && actionDisplayMode === ACTION_DISPLAY_BUTTONS ? "inline-block" : "none";
        saveActionBtn.style.display = isEditing && enableSaveAction && actionDisplayMode === ACTION_DISPLAY_BUTTONS ? "inline-block" : "none";
        actionsWrap.style.display = isEditing && actionDisplayMode === ACTION_DISPLAY_DROPDOWN && (enableInsertAction || enableInsertAndSendAction || enableSaveAction)
            ? "inline-flex"
            : "none";
        insertMenuItem.style.display = enableInsertAction ? "block" : "none";
        insertAndSendMenuItem.style.display = enableInsertAndSendAction ? "block" : "none";
        saveMenuItem.style.display = enableSaveAction ? "block" : "none";
    };

    const updateStats = () => {
        const text = getWorkingText();
        const {
            isPerformanceMode,
            lineCount,
            maxHighlightedMatches,
            minSearchLength,
            useLowGpuMode
        } = getPerformanceState(text);

        const query = search.value.trim();
        const shouldSearch = query.length >= minSearchLength;
        const matchCount = isEditing ? editorMatches.length : useRangeSearch ? currentRangeMatches.length : currentMatches.length;
        const matchPart = shouldSearch
            ? ` • ${t("stats.results", { count: matchCount.toLocaleString() })}${matchCount ? ` • ${activeMatchIndex + 1}/${matchCount}` : ""}`
            : "";
        const perfPart = isPerformanceMode
            ? ` • ${t("stats.performance", {
                mode: manualPerformanceMode == null ? (autoPerformanceMode ? t("stats.performance.auto") : t("stats.performance.globalManual")) : t("stats.performance.viewerManual"),
                min: minSearchLength,
                max: maxHighlightedMatches.toLocaleString()
            })}`
            : "";
        const gpuPart = useLowGpuMode ? ` • ${t("stats.lowGpu")}` : "";
        const editPart = isEditing ? ` • ${t("stats.editing")}` : "";

        stats.textContent = t("stats.summary", {
            characters: text.length.toLocaleString(),
            lines: lineCount.toLocaleString()
        }) + matchPart + perfPart + gpuPart + editPart;
        updateButtons();
    };

    const renderViewer = () => {
        const text = currentText;
        const { isPerformanceMode } = getPerformanceState(text);
        const canUseShikiInPerf = !isPerformanceMode || forceShikiInPerformanceMode;
        const shikiPlugin = getShikiPlugin();
        const canUseShiki = Boolean(
            showShiki
            && Vencord?.Plugins?.isPluginEnabled?.("ShikiCodeblocks")
            && shikiPlugin?.renderHighlighter
            && (
                !isPerformanceMode
                || (canUseShikiInPerf && (forceShikiInPerformanceMode || text.length <= shikiCharLimit))
            )
        );

        if (canUseShiki) {
            try {
                const shikiContainerEl = document.createElement("div");
                shikiContainerEl.style.padding = "0";
                shikiContainerEl.style.setProperty("--text-default", textNormal);
                shikiContainerEl.style.setProperty("--background-base-lower", bgSecondary);
                shikiContainerEl.style.userSelect = "text";
                shikiContainerEl.style.setProperty("-webkit-user-select", "text");
                content.appendChild(shikiContainerEl);
                searchableRoot = shikiContainerEl;
                useRangeSearch = true;

                renderRoot = createRoot(shikiContainerEl);
                renderRoot.render(
                    shikiPlugin!.renderHighlighter!({
                        lang: inferLanguage(filename, text),
                        content: text
                    })
                );
                return;
            } catch (err) {
                console.error("[FullLogViewer] Failed to render Shiki", err);
            }
        }

        const pre = document.createElement("pre");
        pre.style.margin = "0";
        pre.style.whiteSpace = "pre";
        pre.style.wordBreak = "normal";
        pre.style.overflowWrap = "normal";
        pre.style.fontFamily = "var(--font-code)";
        pre.style.fontSize = "12px";
        pre.style.lineHeight = "1.45";
        pre.style.color = textNormal;
        pre.style.userSelect = "text";
        pre.style.setProperty("-webkit-user-select", "text");
        pre.textContent = withLineNumbers(text, getLineCount(text));

        content.appendChild(pre);
        searchableRoot = pre;
        useRangeSearch = false;
    };

    const renderEditor = () => {
        const editorWrap = document.createElement("div");
        editorWrap.style.position = "relative";
        editorWrap.style.width = "100%";
        editorWrap.style.height = "100%";
        editorWrap.style.border = `1px solid ${borderColor}`;
        editorWrap.style.borderRadius = "10px";
        editorWrap.style.background = bgSecondary;
        editorWrap.style.overflow = "hidden";
        editorWrap.style.boxSizing = "border-box";

        const highlightLayer = document.createElement("pre");
        highlightLayer.style.position = "absolute";
        highlightLayer.style.inset = "0";
        highlightLayer.style.margin = "0";
        highlightLayer.style.padding = "14px";
        highlightLayer.style.fontFamily = "var(--font-code)";
        highlightLayer.style.fontSize = "12px";
        highlightLayer.style.lineHeight = "1.45";
        highlightLayer.style.color = textNormal;
        highlightLayer.style.whiteSpace = "pre";
        highlightLayer.style.wordBreak = "normal";
        highlightLayer.style.overflow = "hidden";
        highlightLayer.style.boxSizing = "border-box";
        highlightLayer.style.pointerEvents = "none";
        highlightLayer.style.userSelect = "none";

        const lineNumberLayer = document.createElement("pre");
        lineNumberLayer.style.position = "absolute";
        lineNumberLayer.style.top = "0";
        lineNumberLayer.style.bottom = "0";
        lineNumberLayer.style.left = "0";
        lineNumberLayer.style.margin = "0";
        lineNumberLayer.style.padding = "14px 8px 14px 0";
        lineNumberLayer.style.boxSizing = "border-box";
        lineNumberLayer.style.overflow = "hidden";
        lineNumberLayer.style.textAlign = "right";
        lineNumberLayer.style.fontFamily = "var(--font-code)";
        lineNumberLayer.style.fontSize = "12px";
        lineNumberLayer.style.lineHeight = "1.45";
        lineNumberLayer.style.color = textMuted;
        lineNumberLayer.style.background = bgSecondary;
        lineNumberLayer.style.borderRight = `1px solid ${borderColor}`;
        lineNumberLayer.style.pointerEvents = "none";
        lineNumberLayer.style.userSelect = "none";

        const textarea = document.createElement("textarea");
        textarea.value = currentText;
        textarea.style.width = "100%";
        textarea.style.height = "100%";
        textarea.style.position = "absolute";
        textarea.style.inset = "0";
        textarea.style.resize = "none";
        textarea.style.border = "none";
        textarea.style.background = "transparent";
        textarea.style.color = "transparent";
        textarea.style.caretColor = textNormal;
        textarea.style.padding = "14px";
        textarea.style.fontFamily = "var(--font-code)";
        textarea.style.fontSize = "12px";
        textarea.style.lineHeight = "1.45";
        textarea.style.outline = "none";
        textarea.style.boxSizing = "border-box";
        textarea.style.whiteSpace = "pre";
        textarea.style.wordBreak = "normal";
        textarea.style.overflow = "auto";
        textarea.addEventListener("input", () => {
            render(0);
        });
        textarea.addEventListener("scroll", () => {
            highlightLayer.scrollTop = textarea.scrollTop;
            highlightLayer.scrollLeft = textarea.scrollLeft;
            lineNumberLayer.scrollTop = textarea.scrollTop;
        });

        editor = textarea;
        editorHighlightLayer = highlightLayer;
        editorLineNumberLayer = lineNumberLayer;
        editorWrap.appendChild(highlightLayer);
        editorWrap.appendChild(lineNumberLayer);
        editorWrap.appendChild(textarea);
        content.appendChild(editorWrap);
        paintEditorHighlights(currentText, search.value.trim(), false);
        textarea.focus();
    };

    const renderContent = (retry = 0) => {
        renderRoot?.unmount();
        renderRoot = null;
        searchableRoot = null;
        searchIndex = null;
        editorHighlightLayer = null;
        editorLineNumberLayer = null;
        editorLayerRenderId++;
        editor = null;
        useRangeSearch = false;
        clearCssSearchHighlights(cssHitHighlightName, cssActiveHighlightName);
        content.replaceChildren();
        currentMatches = [];
        currentRangeMatches = [];
        editorMatches = [];
        activeMatchIndex = -1;

        if (isEditing) {
            renderEditor();
            render(0);
            return;
        }

        renderViewer();

        const text = currentText;
        const { isPerformanceMode, maxHighlightedMatches, minSearchLength } = getPerformanceState(text);
        const query = search.value.trim();
        const shouldSearch = query.length >= minSearchLength;
        if (useRangeSearch && searchableRoot) {
            searchIndex ??= buildSearchIndex(searchableRoot);
            currentMatches = [];
            currentRangeMatches = shouldSearch
                ? findSearchRanges(searchIndex, query, maxHighlightedMatches)
                : [];
            if (canUseCssHighlights()) {
                setCssSearchHighlights(cssHitHighlightName, cssActiveHighlightName, currentRangeMatches, -1);
            }
        } else {
            clearCssSearchHighlights(cssHitHighlightName, cssActiveHighlightName);
            currentRangeMatches = [];
            currentMatches = shouldSearch && searchableRoot
                ? applySearchHighlight(searchableRoot, query, maxHighlightedMatches)
                : searchableRoot
                    ? applySearchHighlight(searchableRoot, "")
                    : [];
        }

        const matchCount = useRangeSearch ? currentRangeMatches.length : currentMatches.length;
        if (shouldSearch && matchCount === 0 && retry < 10) {
            if (useRangeSearch && searchIndex?.segments.length === 0) {
                searchIndex = null;
            }
            const shikiIsEnabled = showShiki && Vencord?.Plugins?.isPluginEnabled?.("ShikiCodeblocks");
            if (shikiIsEnabled) {
                setTimeout(() => renderContent(retry + 1), 80);
            }
        }

        if (matchCount > 0) {
            focusMatch(0);
        }

        if (isPerformanceMode) {
            box.style.boxShadow = "none";
        } else {
            box.style.boxShadow = "0 20px 60px rgba(0,0,0,0.45)";
        }

        updateStats();
    };

    const render = (retry = 0) => {
        if (isEditing) {
            currentMatches = [];
            currentRangeMatches = [];

            const text = editor?.value ?? currentText;
            const { query, shouldSearch } = updateEditorMatches(text);

            paintEditorHighlights(text, query, shouldSearch);
            updateStats();
            return;
        }

        if (!searchableRoot) {
            currentMatches = [];
            currentRangeMatches = [];
            editorMatches = [];
            activeMatchIndex = -1;
            updateStats();
            return;
        }

        const { maxHighlightedMatches, minSearchLength } = getPerformanceState(currentText);
        const query = search.value.trim();
        const shouldSearch = query.length >= minSearchLength;
        if (useRangeSearch) {
            searchIndex ??= buildSearchIndex(searchableRoot);
            currentMatches = [];
            currentRangeMatches = shouldSearch
                ? findSearchRanges(searchIndex, query, maxHighlightedMatches)
                : [];
            if (canUseCssHighlights()) {
                setCssSearchHighlights(cssHitHighlightName, cssActiveHighlightName, currentRangeMatches, -1);
            }
        } else {
            clearCssSearchHighlights(cssHitHighlightName, cssActiveHighlightName);
            currentRangeMatches = [];
            currentMatches = shouldSearch
                ? applySearchHighlight(searchableRoot, query, maxHighlightedMatches)
                : applySearchHighlight(searchableRoot, "");
        }

        const matchCount = useRangeSearch ? currentRangeMatches.length : currentMatches.length;
        if (shouldSearch && matchCount === 0 && retry < 10) {
            if (useRangeSearch && searchIndex?.segments.length === 0) {
                searchIndex = null;
            }
            setTimeout(() => render(retry + 1), 80);
        }

        if (matchCount > 0) {
            focusMatch(0);
        } else {
            activeMatchIndex = -1;
        }

        updateStats();
    };

    const onSearchInput = () => {
        if (searchDebounce != null) {
            window.clearTimeout(searchDebounce);
        }
        const { isPerformanceMode } = getPerformanceState(currentText);
        searchDebounce = window.setTimeout(() => {
            render(0);
            searchDebounce = null;
        }, isPerformanceMode ? 220 : 90);
    };
    search.addEventListener("input", onSearchInput);

    prevBtn.onclick = () => {
        if (isEditing && editor) updateEditorMatches(editor.value);
        focusMatch(activeMatchIndex - 1);
    };
    nextBtn.onclick = () => {
        if (isEditing && editor) updateEditorMatches(editor.value);
        focusMatch(activeMatchIndex + 1);
    };

    const stopShortcutEvent = (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (eventMatchesShortcut(e, saveShortcut, closeOnShift)) {
            stopShortcutEvent(e);
            if (isEditing && enableSaveAction && !e.repeat) {
                void runSaveAction(e);
            }
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
            const selectedText = window.getSelection?.()?.toString() ?? "";
            if (selectedText) {
                e.preventDefault();
                void navigator.clipboard.writeText(selectedText);
            }
            return;
        }

        if (isEditing && enableInsertAndSendAction && eventMatchesShortcut(e, insertAndSendShortcut, closeOnShift)) {
            stopShortcutEvent(e);
            runInsertAction(e, true);
            return;
        }

        if (isEditing && enableInsertAction && eventMatchesShortcut(e, insertShortcut, closeOnShift)) {
            stopShortcutEvent(e);
            runInsertAction(e, false);
            return;
        }

        if (e.key === "Escape") {
            cleanup();
        }
    };

    const onKeyUp = (e: KeyboardEvent) => {
        if (eventMatchesShortcut(e, saveShortcut, closeOnShift)) {
            stopShortcutEvent(e);
        }
    };

    const cleanup = () => {
        if (didCleanup) return;
        didCleanup = true;
        document.removeEventListener("keydown", onKeyDown, true);
        document.removeEventListener("keyup", onKeyUp, true);
        search.removeEventListener("input", onSearchInput);
        if (searchDebounce != null) {
            window.clearTimeout(searchDebounce);
            searchDebounce = null;
        }
        renderRoot?.unmount();
        clearCssSearchHighlights(cssHitHighlightName, cssActiveHighlightName);
        cssHighlightStyle.remove();
        overlay.remove();
    };

    perfToggleBtn.onclick = () => {
        const { isPerformanceMode } = getPerformanceState(currentText);
        const nextManualMode = !isPerformanceMode;
        onManualPerformanceModeChange?.(nextManualMode);
        cleanup();
        openLogModal(filename, currentText, nextManualMode, onManualPerformanceModeChange);
    };

    function shouldCloseAfterAction(event?: MouseEvent | KeyboardEvent) {
        return autoCloseViewer || Boolean(closeOnShift && event?.shiftKey);
    }

    function cleanupAfterAction(event?: MouseEvent | KeyboardEvent) {
        if (event instanceof KeyboardEvent) {
            window.setTimeout(cleanup, 350);
            return;
        }

        cleanup();
    }

    function finishAction(success: boolean, event?: MouseEvent | KeyboardEvent) {
        if (!success) return;

        currentText = getWorkingText();
        if (shouldCloseAfterAction(event)) {
            cleanupAfterAction(event);
            return;
        }

        if (isEditing) {
            isEditing = false;
            renderContent();
        } else {
            updateStats();
        }
    }

    function runInsertAction(event?: MouseEvent | KeyboardEvent, sendImmediately = false) {
        if (!isEditing) return;
        actionsDropdown.style.display = "none";
        const text = getWorkingText();
        finishAction(attachFileToCurrentChannel(filename, text, sendImmediately), event);
    }

    async function runSaveAction(event?: MouseEvent | KeyboardEvent) {
        if (!isEditing || isSavingFile) return;
        isSavingFile = true;
        actionsDropdown.style.display = "none";
        const text = getWorkingText();
        try {
            finishAction(await saveFileToComputer(filename, text), event);
        } finally {
            isSavingFile = false;
        }
    }

    insertActionBtn.onclick = event => runInsertAction(event, false);
    insertAndSendActionBtn.onclick = event => runInsertAction(event, true);
    saveActionBtn.onclick = event => void runSaveAction(event);
    insertMenuItem.onclick = event => runInsertAction(event, false);
    insertAndSendMenuItem.onclick = event => runInsertAction(event, true);
    saveMenuItem.onclick = event => void runSaveAction(event);

    editBtn.onclick = () => {
        isEditing = true;
        renderContent();
    };

    closeEditBtn.onclick = () => {
        isEditing = false;
        renderContent();
    };

    overlay.addEventListener("click", e => {
        if (e.target === overlay) cleanup();
    });
    box.addEventListener("click", e => {
        if (!actionsWrap.contains(e.target as Node)) {
            actionsDropdown.style.display = "none";
        }
    });

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);

    closeBtn.onclick = cleanup;

    header.appendChild(title);
    header.appendChild(search);
    header.appendChild(prevBtn);
    header.appendChild(nextBtn);
    header.appendChild(copyBtn);
    header.appendChild(editBtn);
    header.appendChild(closeEditBtn);
    header.appendChild(insertActionBtn);
    header.appendChild(insertAndSendActionBtn);
    header.appendChild(saveActionBtn);
    actionsDropdown.appendChild(insertMenuItem);
    actionsDropdown.appendChild(insertAndSendMenuItem);
    actionsDropdown.appendChild(saveMenuItem);
    actionsWrap.appendChild(actionsMenuBtn);
    actionsWrap.appendChild(actionsDropdown);
    header.appendChild(actionsWrap);
    if (performanceModeEnabled && allowManualPerformanceToggleInViewer) {
        header.appendChild(perfToggleBtn);
    }
    header.appendChild(closeBtn);

    box.appendChild(header);
    box.appendChild(stats);
    box.appendChild(content);
    overlay.appendChild(box);
    (overlay as { vcCleanup?: () => void; }).vcCleanup = cleanup;
    document.body.appendChild(overlay);

    renderContent();
    search.focus();
}

function getFullFileUrlsFromButton(button: HTMLButtonElement, fileName: string, attachmentUrl?: string | null): string[] {
    const lowerName = fileName.toLowerCase();
    const attachmentRoot = button.closest("[class*=attachment]") ?? button.closest("[class*=container]") ?? button.parentElement;
    const getCandidatesFrom = (root: ParentNode) => {
        return Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"))
            .map(link => link.href)
            .filter(Boolean)
            .filter(href => href.includes("/attachments/") || href.toLowerCase().includes(lowerName));
    };

    const localCandidates = getCandidatesFrom((attachmentRoot ?? document) as ParentNode);
    const baseCandidates = localCandidates.length ? localCandidates : getCandidatesFrom(document);

    const prioritizedCandidates = attachmentUrl ? [attachmentUrl, ...baseCandidates] : baseCandidates;
    const sorted = [...prioritizedCandidates].sort((a, b) => {
        const aExact = isExactFileUrl(a, lowerName);
        const bExact = isExactFileUrl(b, lowerName);
        return Number(bExact) - Number(aExact);
    });

    const expanded = sorted.flatMap(url => {
        const noQuery = url.split("?")[0] ?? url;
        const withDownload = url.includes("?") ? `${url}&download=1` : `${url}?download=1`;
        return [url, noQuery, withDownload];
    });

    return Array.from(new Set(expanded));
}

async function getFullFileContents(
    button: HTMLButtonElement,
    fileName: string,
    previewContents: string,
    bytesLeft: number,
    attachmentUrl?: string | null
): Promise<string | null> {
    const candidates = getFullFileUrlsFromButton(button, fileName, attachmentUrl);
    if (!candidates.length) return null;

    let bestContent: string | null = null;

    for (const url of candidates) {
        let response: Response;
        try {
            response = await fetch(url);
        } catch {
            continue;
        }

        if (!response.ok) continue;

        let text: string;
        try {
            text = await response.text();
        } catch {
            continue;
        }

        if (!bestContent || text.length > bestContent.length) {
            bestContent = text;
        }

        if (text.replace(/\r\n/g, "\n") !== previewContents.replace(/\r\n/g, "\n")) {
            return text;
        }
    }

    if (!bestContent) return null;

    const previewNormalized = previewContents.replace(/\r\n/g, "\n");
    const bestNormalized = bestContent.replace(/\r\n/g, "\n");
    const stillLooksTruncated = bestNormalized === previewNormalized;

    return stillLooksTruncated ? null : bestContent;
}

function isExactFileUrl(url: string, lowerName: string): boolean {
    const path = url.split("?")[0]?.toLowerCase() ?? "";
    try {
        return decodeURIComponent(path).endsWith(`/${lowerName}`);
    } catch {
        return path.endsWith(`/${lowerName}`);
    }
}

function FullLogButton({ fileName, fileContents, bytesLeft, attachmentUrl }: { fileName: string, fileContents: string, bytesLeft: number, attachmentUrl?: string | null; }) {
    const [loading, setLoading] = useState(false);
    const [isDuplicate, setIsDuplicate] = useState(false);
    const [manualPerformanceMode, setManualPerformanceMode] = useState<boolean | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);

    if (!isSupportedFilename(fileName)) return null;

    useEffect(() => {
        const button = buttonRef.current;
        if (!button) return;

        const attachmentRoot = button.closest("[class*=attachment]") ?? button.closest("[class*=container]") ?? button.parentElement;
        if (!attachmentRoot) return;

        const allPluginButtons = Array.from(attachmentRoot.querySelectorAll<HTMLButtonElement>("button.vc-open-full-file-button"));
        setIsDuplicate(allPluginButtons[0] !== button);
    }, []);

    if (isDuplicate) return null;

    return (
        <Tooltip text={loading ? t("viewer.loading") : t("viewer.openFullFile")}>
            {props => (
                <button
                    {...props}
                    ref={buttonRef}
                    className="vc-open-full-file-button"
                    style={{
                        marginLeft: "8px",
                        background: "transparent",
                        border: "1px solid var(--background-modifier-accent)",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        cursor: loading ? "wait" : "pointer",
                        color: "var(--text-normal)"
                    }}
                    disabled={loading}
                    onClick={async event => {
                        try {
                            setLoading(true);
                            let contentToOpen = fileContents;

                            const downloadedContents = await getFullFileContents(
                                event.currentTarget,
                                fileName,
                                fileContents,
                                bytesLeft,
                                attachmentUrl
                            );

                            if (downloadedContents != null) {
                                contentToOpen = downloadedContents;
                            } else if (bytesLeft > 0) {
                                alert(t("alert.fetchFullFileFailed"));
                                return;
                            }

                            openLogModal(fileName || t("defaultLogFilename"), contentToOpen, manualPerformanceMode, setManualPerformanceMode);
                        } catch (err) {
                            console.error("[FullLogViewer]", err);
                            alert(t("alert.loadFullFileFailed"));
                        } finally {
                            setLoading(false);
                        }
                    }}
                >
                    {loading ? t("viewer.loading") : t("viewer.openFullFile")}
                </button>
            )}
        </Tooltip>
    );
}

export default definePlugin({
    name: "FileViewer",
    description: "Open, search, copy and edit full text file attachments",
    tags: ["Chat", "Utility"],
    settings,
    authors: [Devs.Lepoissongamer],
    id: 669191195997503491n,

    patches: [
        {
            find: "#{intl::PREVIEW_BYTES_LEFT}",
            replacement: {
                match: /fileContents:(\i),bytesLeft:(\i)\}\):null,/,
                replace: "$&$self.addOpenButton({...arguments[0],fileContents:$1,bytesLeft:$2}),"
            }
        }
    ],

    addOpenButton: ErrorBoundary.wrap((attachmentData: {
        fileName?: string,
        filename?: string,
        name?: string,
        fileContents: string,
        bytesLeft: number,
        url?: string,
        downloadUrl?: string,
        attachmentUrl?: string,
        attachment?: { filename?: string, name?: string, url?: string, downloadUrl?: string; };
    }) => {
        const { fileContents, bytesLeft } = attachmentData;
        const fileName =
            attachmentData.fileName
            ?? attachmentData.filename
            ?? attachmentData.name
            ?? attachmentData.attachment?.filename
            ?? attachmentData.attachment?.name;
        const attachmentUrl =
            attachmentData.url
            ?? attachmentData.downloadUrl
            ?? attachmentData.attachmentUrl
            ?? attachmentData.attachment?.url
            ?? attachmentData.attachment?.downloadUrl
            ?? null;

        if (!fileName || typeof fileContents !== "string") return null;
        return <FullLogButton fileName={fileName} fileContents={fileContents} bytesLeft={bytesLeft} attachmentUrl={attachmentUrl} />;
    }, { noop: true })
});
