/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { githubSourceToStylesheetUrl } from "./githubSource";

const IMPORT_RE = /@import\s+url\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;

const SKIP_IMPORT_HOSTS = new Set([
    "fonts.googleapis.com",
    "fonts.gstatic.com",
]);

const SKIP_IMPORT_SNIPPETS = [
    "BetterDiscordAddons",
    "usrbg.dist",
];

export interface BdThemeMeta {
    name?: string;
    source?: string;
}

export interface ResolvedThemeCss {
    urls: string[];
    source?: string;
    saveLocal: boolean;
}

export function parseBdThemeMeta(css: string): BdThemeMeta {
    const block = css.split("/**", 2)?.[1]?.split("*/", 1)?.[0];
    if (!block) return {};

    const meta: BdThemeMeta = {};
    const lines = block.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.replace(/^\s*\*\s?/, "").trim();
        if (!trimmed.startsWith("@")) continue;

        const space = trimmed.indexOf(" ");
        if (space === -1) continue;

        const key = trimmed.slice(1, space).toLowerCase();
        const value = trimmed.slice(space + 1).trim();
        if (key === "source") meta.source = value;
        if (key === "name") meta.name = value;
    }

    return meta;
}

function parseImports(css: string): string[] {
    const urls: string[] = [];
    for (const match of css.matchAll(IMPORT_RE)) {
        if (match[1]) urls.push(match[1]);
    }
    return urls;
}

function isSkippedImport(url: string): boolean {
    try {
        const { hostname } = new URL(url);
        if (SKIP_IMPORT_HOSTS.has(hostname)) return true;
    } catch {
        return true;
    }
    return SKIP_IMPORT_SNIPPETS.some(snippet => url.includes(snippet));
}

function resolveImportUrl(url: string): string | null {
    if (isSkippedImport(url)) return null;

    const fromGithub = githubSourceToStylesheetUrl(url);
    if (fromGithub) return fromGithub;

    if (url.endsWith(".css")) return url;
    return null;
}

export function resolveThemeStylesheetUrls(
    css: string,
    pageSourceUrl?: string | null
): ResolvedThemeCss {
    if (pageSourceUrl) {
        const fromPage = githubSourceToStylesheetUrl(pageSourceUrl);
        if (fromPage) {
            return {
                urls: [fromPage],
                source: pageSourceUrl,
                saveLocal: false,
            };
        }
    }

    const meta = parseBdThemeMeta(css);
    const headerSource = meta.source ? githubSourceToStylesheetUrl(meta.source) : null;
    if (headerSource) {
        return {
            urls: [headerSource],
            source: meta.source,
            saveLocal: false,
        };
    }

    const imports = parseImports(css);
    const importUrls: string[] = [];

    for (const imp of imports) {
        const resolved = resolveImportUrl(imp);
        if (resolved) importUrls.push(resolved);
    }

    const unique = [...new Set(importUrls)];
    const body = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(IMPORT_RE, "").trim();

    return {
        urls: unique,
        source: meta.source,
        saveLocal: unique.length === 0 && body.length > 40,
    };
}
