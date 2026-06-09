/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

import { Logger } from "@utils/Logger";
import { onlyOnce } from "@utils/onlyOnce";
import { showToast, Toasts } from "@webpack/common";

// Fetches and caches MediaWiki siteinfo (namespaces, interwiki map, magic words)

// https://www.mediawiki.org/wiki/API:Etiquette#The_User-Agent_header
const API_USER_AGENT = "WikiLinks (Vencord plugin; https://github.com/Vendicated/Vencord)";

const logger = new Logger("WikiLinks");

// Warn once if the wiki is unreachable
const warnUnavailable = onlyOnce(() =>
    showToast("WikiLinks: couldn't reach the wiki to verify pages, so links weren't filtered", Toasts.Type.FAILURE));

export interface NamespaceInfo {
    id: number;
    // Localised name, e.g. `Файл` (empty for mainspace)
    name: string;
    // Canonical English name, e.g. `File`
    canonical: string;
    caseSensitive: boolean;
}

export interface InterwikiEntry {
    prefix: string;
    // Target URL with a `$1` placeholder
    url: string;
}

export interface MagicWord {
    name: string;
    aliases: string[];
    caseSensitive: boolean;
}

export interface SiteInfo {
    // API endpoint this info was fetched from, used for existence queries
    apiUrl: string;
    baseUrl: string;
    mainPage: string;
    capitalizeTitles: boolean;
    // Namespace lookup by normalised localised/canonical name and aliases
    namespaces: Map<string, NamespaceInfo>;
    namespacesById: Map<number, NamespaceInfo>;
    interwikiMap: Map<string, InterwikiEntry>;
    magicWords: MagicWord[];
    magicWordsByName: Map<string, MagicWord>;
    // Pre-filtered for transclusion resolution: excludes behavior switches (__TOC__ etc.), path/date variables, and parser-function look-alikes
    transclusionMagicWords: MagicWord[];
}

// Normalise a namespace/interwiki key for case- and space-insensitive lookup
export const normalizeKey = (s: string) => s.toLowerCase().replace(/_/g, " ").trim();

// One promise per wiki, shared by concurrent lookups
const cache = new Map<string, Promise<SiteInfo | null>>();

// Synchronously available successful results, so resolution never awaits the network
const ready = new Map<string, SiteInfo>();

// Retry a failed fetch after this long instead of pinning to naive resolution
const RETRY_FAILED_AFTER = 60_000;

// Start (or reuse) a background siteinfo fetch for a wiki URL format (`.../wiki/$1` or `.../api.php`)
export function getSiteInfo(format: string): Promise<SiteInfo | null> {
    let entry = cache.get(format);
    if (!entry) {
        entry = loadSiteInfo(format);
        cache.set(format, entry);
        entry.then(info => {
            // Keep successes available; drop a failure after the cooldown so it retries
            if (info) ready.set(format, info);
            else setTimeout(() => {
                // Only delete our own entry; a new fetch started during the cooldown takes priority
                if (cache.get(format) === entry) cache.delete(format);
            }, RETRY_FAILED_AFTER);
        });
    }
    return entry;
}

// Already-loaded siteinfo, or undefined if it still needs fetching
export function getReadySiteInfo(format: string): SiteInfo | undefined {
    return ready.get(format);
}

function apiUrlFromFormat(format: string): string | null {
    if (format.endsWith("/wiki/$1")) return format.replace("/wiki/$1", "/w/api.php");
    if (format.endsWith("/api.php")) return format;
    return null;
}

async function loadSiteInfo(format: string): Promise<SiteInfo | null> {
    const apiUrl = apiUrlFromFormat(format);
    if (!apiUrl) return null;

    const candidates = [apiUrl];
    const altUrl = apiUrl.replace("/w/api.php", "/api.php");
    if (altUrl !== apiUrl) candidates.push(altUrl);

    for (const url of candidates) {
        try {
            const info = await fetchSiteInfo(url);
            if (info) return info;
        } catch { }
    }
    return null;
}

async function apiGet(apiUrl: string, params: string): Promise<any> {
    const url = `${apiUrl}?${params}&format=json&formatversion=2&origin=*`;
    try {
        const res = await fetch(url, {
            headers: { "Api-User-Agent": API_USER_AGENT },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
            logger.warn(`Request to ${apiUrl} failed: ${res.status} ${res.statusText}`);
            return null;
        }
        return await res.json();
    } catch (e) {
        logger.warn(`Request to ${apiUrl} failed:`, e);
        return null;
    }
}

async function fetchSiteInfo(apiUrl: string): Promise<SiteInfo | null> {
    const data = await apiGet(apiUrl, "action=query&meta=siteinfo"
        + "&siprop=general|namespaces|namespacealiases|interwikimap|magicwords");
    const q = data?.query;
    if (!q?.general) return null;

    return parseSiteInfo(q, apiUrl);
}

// Per-session cache of resolved title existence, keyed by `${apiUrl}\n${title}`
const existenceCache = new Map<string, boolean>();

// Subset of `titles` that exist on the wiki. Sends the titles to it, so opt-in only
export async function getExistingTitles(apiUrl: string, titles: string[]): Promise<Set<string>> {
    const existing = new Set<string>();
    const toQuery: string[] = [];
    for (const title of new Set(titles)) {
        const cached = existenceCache.get(`${apiUrl}\n${title}`);
        if (cached === undefined) toQuery.push(title);
        else if (cached) existing.add(title);
    }

    for (let i = 0; i < toQuery.length; i += 50) {
        const chunk = toQuery.slice(i, i + 50);
        const q = (await apiGet(apiUrl, `action=query&titles=${encodeURIComponent(chunk.join("|"))}`))?.query;
        if (!q) {
            warnUnavailable();
            chunk.forEach(t => existing.add(t)); // can't verify -> keep, don't cache
            continue;
        }

        // Map our submitted title -> the API's normalised title
        const normalised = new Map<string, string>();
        for (const { from, to } of q.normalized ?? []) normalised.set(from, to);

        const status = new Map<string, boolean>();
        for (const page of q.pages ?? []) {
            status.set(page.title, !page.missing && !page.invalid);
        }

        for (const title of chunk) {
            const canonical = normalised.get(title) ?? title;
            // Default to "exists" if the API didn't return a verdict for it
            const ok = status.get(canonical) !== false;
            existenceCache.set(`${apiUrl}\n${title}`, ok);
            if (ok) existing.add(title);
        }
    }

    return existing;
}

function parseSiteInfo(q: any, apiUrl: string): SiteInfo {
    const namespaces = new Map<string, NamespaceInfo>();
    const namespacesById = new Map<number, NamespaceInfo>();

    for (const ns of Object.values<any>(q.namespaces ?? {})) {
        const info: NamespaceInfo = {
            id: ns.id,
            name: ns.name ?? "",
            canonical: ns.canonical ?? ns.name ?? "",
            caseSensitive: ns.case === "case-sensitive",
        };
        namespacesById.set(info.id, info);
        if (info.name) namespaces.set(normalizeKey(info.name), info);
        if (info.canonical) namespaces.set(normalizeKey(info.canonical), info);
        if (!info.name && info.id === 0) namespaces.set("", info);
    }

    for (const { id, alias } of q.namespacealiases ?? []) {
        const info = namespacesById.get(id);
        if (info) namespaces.set(normalizeKey(alias), info);
    }

    const interwikiMap = new Map<string, InterwikiEntry>();
    for (const iw of q.interwikimap ?? []) {
        if (!iw.url?.includes("$1")) continue;
        interwikiMap.set(normalizeKey(iw.prefix), { prefix: iw.prefix, url: iw.url });
    }

    const magicWords: MagicWord[] = (q.magicwords ?? []).map((mw: any) => ({
        name: mw.name,
        aliases: mw.aliases ?? [],
        caseSensitive: mw["case-sensitive"] ?? false,
    }));
    const magicWordsByName = new Map<string, MagicWord>(magicWords.map(mw => [mw.name, mw]));
    const transclusionMagicWords = magicWords.filter(x =>
        !x.aliases.some(a => a.startsWith("__")) &&
        !x.name.includes("_") &&
        x.name !== "rawsuffix" &&
        x.name !== "special");

    return {
        apiUrl,
        baseUrl: q.general.base ?? "",
        mainPage: q.general.mainpage ?? "",
        capitalizeTitles: q.general.case === "first-letter",
        namespaces,
        namespacesById,
        interwikiMap,
        magicWords,
        magicWordsByName,
        transclusionMagicWords,
    };
}
