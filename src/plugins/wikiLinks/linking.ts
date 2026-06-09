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

// Wiki link detection and resolution ported from DiscordWikiBot
// https://github.com/stjohann/DiscordWikiBot/blob/master/DiscordWikiBot/Linking.cs

import { Logger } from "@utils/Logger";
import { getExistingTitles, getReadySiteInfo, getSiteInfo, type MagicWord, type NamespaceInfo, normalizeKey, type SiteInfo } from "./siteinfo";

const logger = new Logger("WikiLinks");

export interface WikiOptions {
    format: string;
    templateNamespace: string;
    capitalizeFirst: boolean;
    useDiscordLinkEmbeds: boolean;
    onlyLinkExisting: boolean;
}

interface ResolvedLink {
    // Finished `[[`label`]](url)`
    markdown: string;
    // Resolved page title for existence checks, or null to skip checking
    title: string | null;
    // API endpoint the title lives on, or null when it can't be checked
    apiUrl: string | null;
}

// Link syntax ([[ ]], {{ }}) plus protected regions (code/nowiki/quotes) to skip
const PROTECTED_OR_LINK = /(`{2,3})[\s\S]*?\1|(?<!\\)`[\s\S]*?`|<nowiki>[\s\S]*?<\/nowiki>|^>>> [\s\S]*$|^> .*$|(\[\[|\{{2,})([^[\]{}|\n\r]+)(?:\|(?!\[\[)[^{}\n\r]*?)?(\]\]|\}{2,})/gim;

// Namespaces that are always capitalised. See Manual:$wgCapitalLinks
const CAPITALISED_NAMESPACES = [-1, 2, 3, 8, 9];

// Percent-encodings matching {{PAGENAMEE}}
const ENCODE_MAP: Record<string, string> = {
    "&": "%26", "+": "%2B", "=": "%3D", "?": "%3F", "\\": "%5C",
    "^": "%5E", "`": "%60", "~": "%7E", "<": "%3C", ">": "%3E",
    "(": "%28", ")": "%29",
};

// URLs that use a non-`_` delimiter for spaces
// this is jank as fuck so its not listed as a feature
const SPECIAL_DELIMITERS: Record<string, string> = {
    "://www.google.com/search": "+",
};

// URLs for which an embed is always useful
const ALWAYS_EMBEDDABLE = [
    "://phabricator.wikimedia.org/T",
    "://www.wikidata.org/wiki/Property:P",
];

// Characters useless in links that MediaWiki strips
const DELETED_CHARS = ["­", "‎", "‏"];

// https://www.mediawiki.org/wiki/Manual:$wgUrlProtocols
const URI_PROTOCOLS = [
    "bitcoin:", "ftp://", "ftps://", "geo:", "git://", "gopher://", "http://",
    "https://", "irc://", "ircs://", "magnet:", "mailto:", "matrix:", "mms://",
    "news:", "nntp://", "redis://", "sftp://", "sip:", "sips:", "sms:",
    "ssh://", "svn://", "tel:", "telnet://", "urn:", "worldwind://", "xmpp:",
];

const byteLength = (s: string) => new TextEncoder().encode(s).length;
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const startsWithCI = (s: string, prefix: string) => s.toLowerCase().startsWith(prefix.toLowerCase());

function htmlDecode(input: string): string {
    if (typeof document !== "undefined") {
        const el = document.createElement("textarea");
        el.innerHTML = input;
        return el.value;
    }
    // No DOM available (e.g. tests): decode numeric entities only
    return input
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

// Clean up a page title from unnecessary characters
function decodePageTitle(input: string): string {
    let str = input.trim().replace(/^:+/, "").replace(/_/g, " ");
    str = str.replace(/ {2,}/g, " ");
    if (str.includes("&")) str = htmlDecode(str);
    if (str.includes("%")) {
        try { str = decodeURIComponent(str); } catch { /* leave malformed input as-is */ }
    }
    for (const ch of DELETED_CHARS) str = str.split(ch).join("");
    return str.trim();
}

// Encode a page title according to MediaWiki rules
function encodePageTitle(input: string, spaceChar = "_"): string {
    let str = decodePageTitle(input).replace(/\s+/g, " ");
    for (const [ch, enc] of Object.entries(ENCODE_MAP)) str = str.split(ch).join(enc);
    return str.split(" ").join(spaceChar);
}

// Capitalise the first letter unless disabled or Georgian
function capitalise(value: string, doCapitalise = true): string {
    if (!doCapitalise || value.length === 0) return value;
    if (/\p{Script=Georgian}/u.test(value[0])) return value;
    return value[0].toUpperCase() + value.slice(1);
}

// Whether a page title is invalid per MediaWiki restrictions
function isInvalid(input: string, checkLength = false, isMediaWiki = true, checkProtocol = true): boolean {
    let str = input;
    const hash = str.indexOf("#");
    if (hash !== -1) str = str.slice(0, hash);

    if (checkLength) {
        // nsTitle is formatted as `${ns.id}:title`
        // Special: (id −1) allows up to 512 bytes
        const isSpecial = isMediaWiki && str.startsWith("-1:");
        if (isSpecial && byteLength(str) > 512) return true;
        if (byteLength(str) > 255) return true;
    }

    if (str === "." || str === "..") return true;
    if (str.startsWith("./") || str.startsWith("../")) return true;
    if (str.includes("/./") || str.includes("/../")) return true;
    if (str.endsWith("/.") || str.endsWith("/..")) return true;

    if (checkProtocol && URI_PROTOCOLS.some(p => str.startsWith(p))) return true;
    if (/^ *:{2,}/.test(str)) return true;

    return /[<>[\]{}|]|~{3,}|&(?:[a-z]+|#x?\d+);/i.test(str);
}

// Build a wiki URL for a title
function getUrl(title: string, format: string): string {
    let spaceChar = "_";
    for (const [key, val] of Object.entries(SPECIAL_DELIMITERS)) {
        if (format.includes(key)) { spaceChar = val; break; }
    }
    return format.replace("$1", encodePageTitle(title, spaceChar));
}

// Wrap a title and link text into Discord markdown
function getMarkdownLink(title: string, format: string, text: string, useEmbeds: boolean): string {
    const url = getUrl(title, format);
    const embeddable = ALWAYS_EMBEDDABLE.some(l => url.includes(l));
    // Spaces inside ( ) prevent Discord from treating this as a standard markdown link (which auto-embeds)
    return (useEmbeds || embeddable) ? `[${text}]( ${url} )` : `[${text}]( <${url}> )`;
}

// Builds `[[`label`]](url)`
function composeMarkdown(brackets: string, endBrackets: string, label: string, urlTitle: string, format: string, useEmbeds: boolean): string {
    const linkStart = brackets.slice(0, 2);
    const linkEnd = endBrackets.slice(0, 2);

    let esc = "`";
    if (label.startsWith(esc)) label = " " + label;
    if (label.endsWith(esc)) label += " ";
    if (label.includes(esc)) esc = "``";

    const text = `${linkStart}${esc}${label}${esc}${linkEnd}`;
    return getMarkdownLink(urlTitle, format, text, useEmbeds);
}

// Resolution using fetched siteinfo (namespaces, interwiki, magic words)

const nsByName = (site: SiteInfo, name: string) => site.namespaces.get(normalizeKey(name));
const iwByPrefix = (site: SiteInfo, prefix: string) => site.interwikiMap.get(normalizeKey(prefix));

// Localised aliases for a magic word
function magicWordNames(name: string, site: SiteInfo): string[] {
    let names = site.magicWordsByName.get(name)?.aliases;
    if (!names || names.length === 0) names = [name];
    if (name === "invoke" || name === "special") names = names.map(x => `#${x}:`);
    return names;
}

function hasParserFunction(str: string, data: MagicWord): boolean {
    // Variables (page name, dates, server info, revision stats) look like parser functions
    // syntactically but expand to values without taking arguments
    const notParserFunction =
        data.name.startsWith("server") || data.name.endsWith("path") ||
        data.name.startsWith("revision") || data.name.startsWith("numberof") ||
        data.name.startsWith("current") || data.name.startsWith("local");
    if (notParserFunction) return false;

    const compare = (value: string) => {
        const alias = value.replace(/:+$/, "") + ":";
        return data.caseSensitive ? str.startsWith(alias) : startsWithCI(str, alias);
    };
    return compare(data.name) || data.aliases.some(compare);
}

// Whether a string is a known magic word, variable or parser function
function hasMagicWord(str: string, site: SiteInfo): boolean {
    if (str.startsWith("#")) return true;
    if (site.transclusionMagicWords.some(x => x.aliases.includes(str.toUpperCase()))) return true;
    if (!str.includes(":")) return false;
    return site.transclusionMagicWords.some(x => hasParserFunction(str, x));
}

// Initial namespace and stripped title for a transclusion
function getTransclusionInfo(title: string, site: SiteInfo): { ns: NamespaceInfo | null; title: string; } | null {
    if (title.startsWith(":")) {
        return { ns: site.namespacesById.get(0) ?? null, title: title.replace(/^ *: */, "") };
    }

    const stripPrefixes = (names: string[]) =>
        title.replace(new RegExp(`^ *(?:${names.map(escapeRegExp).join("|")}) *`, "i"), "");

    // Strip subst:/safesubst:/raw:/msg: prefixes
    title = stripPrefixes([
        ...magicWordNames("subst", site), ...magicWordNames("safesubst", site),
        ...magicWordNames("raw", site), ...magicWordNames("msg", site),
    ]);

    const tryNamespace = (magicName: string, nsLookup: NamespaceInfo | undefined) => {
        const names = magicWordNames(magicName, site);
        if (nsLookup && names.some(x => startsWithCI(title, x))) {
            return { ns: nsLookup, title: stripPrefixes(names) };
        }
        return null;
    };

    // {{int:}} -> MediaWiki:, {{#special:}} -> Special:, {{#invoke:}} -> Module:
    return tryNamespace("int", site.namespacesById.get(8))
        ?? tryNamespace("special", site.namespacesById.get(-1))
        ?? tryNamespace("invoke", nsByName(site, "module"))
        ?? (hasMagicWord(title, site) ? null : { ns: nsByName(site, "template") ?? null, title });
}

// Shared early validation for both resolve paths
function validateLink(brackets: string, rawTitle: string, endBrackets: string): { isLink: boolean; isTransclusion: boolean; } | null {
    const title = rawTitle.trim();
    const isLink = brackets === "[[";
    const isTransclusion = brackets.startsWith("{{");
    if (isLink && !endBrackets.startsWith("]")) return null;
    if (isTransclusion && !endBrackets.startsWith("}")) return null;
    if (brackets.startsWith("{{{") && endBrackets.startsWith("}}}")) return null;
    if (title.length === 0 || isInvalid(title, false)) return null;
    if (isLink && title.startsWith("#")) return null;
    if (isTransclusion && title.startsWith("/")) return null;
    return { isLink, isTransclusion };
}

// Resolve a matched link to markdown using siteinfo, or null to skip it
function resolveLinkSite(brackets: string, rawTitle: string, endBrackets: string, opts: WikiOptions, defaultSite: SiteInfo, valid: { isLink: boolean; isTransclusion: boolean; }): ResolvedLink | null {
    let str = rawTitle.trim();
    const { isLink, isTransclusion } = valid;

    let currentSite = defaultSite;
    let currentFormat = opts.format;
    let ns: NamespaceInfo | null = null;
    let capitalised = defaultSite.capitalizeTitles;
    let isMediaWiki = true;
    const iwList: string[] = [];

    if (isTransclusion) {
        const tuple = getTransclusionInfo(str, defaultSite);
        if (tuple === null) return null;
        ns = tuple.ns;
        str = tuple.title;
    }

    // Resolve namespace and interwiki prefixes
    const prefixRegex = /^ *:? *([^:]+?) *: */;
    let match = prefixRegex.exec(str);
    while (str.includes(":") && match) {
        const prefix = match[1];
        const nsMatch = nsByName(currentSite, prefix);
        const iw = iwByPrefix(currentSite, prefix);

        if (nsMatch) {
            ns = nsMatch;
            str = str.replace(prefixRegex, "").trim();
            if (ns.id === -2) ns = nsByName(currentSite, "file") ?? ns; // Media: -> File:
            break; // no interwiki after a namespace
        }

        if (!isTransclusion && iw) {
            capitalised = false;
            currentFormat = iw.url;
            const newSite = getReadySiteInfo(currentFormat);
            if (newSite) {
                currentSite = newSite;
                capitalised = newSite.capitalizeTitles;
            } else {
                getSiteInfo(currentFormat); // warm in the background for next time
                isMediaWiki = false;
            }
            iwList.push(prefix);
            str = str.replace(prefixRegex, "").trim();
            if (!newSite) break; // not loaded yet -> resolve naively this pass
        } else {
            break;
        }

        match = prefixRegex.exec(str);
    }

    if (ns && str.length === 0) return null;
    if (ns && CAPITALISED_NAMESPACES.includes(ns.id)) capitalised = true;

    const isDifferentWiki = isMediaWiki && currentSite.baseUrl !== defaultSite.baseUrl;
    if (isDifferentWiki && str.length === 0) str = currentSite.mainPage;

    str = decodePageTitle(str);

    const nsTitle = (!ns || ns.id === 0) ? str : `${ns.id}:${str}`;
    if (isInvalid(nsTitle, true, isMediaWiki, !isDifferentWiki)) return null;

    str = capitalise(str, capitalised);

    let linkStr = str;
    if (ns && ns.id !== 0) {
        str = `${ns.name}:${str}`;
        // Template links show the bare title, everything else shows the namespace
        if (!(isTransclusion && ns.id === 10)) linkStr = str;
    }
    if (isTransclusion && ns && ns.id === 0) linkStr = ":" + linkStr;

    let prefixes = iwList.join(":");
    if (prefixes.length > 0) prefixes += ":";
    linkStr = `${prefixes}${linkStr}`;

    const markdown = composeMarkdown(brackets, endBrackets, linkStr, str, currentFormat, opts.useDiscordLinkEmbeds);
    return { markdown, title: str, apiUrl: isMediaWiki ? currentSite.apiUrl : null };
}

// Naive resolution used when siteinfo is unavailable (offline / non-MediaWiki)

function resolveTransclusionNaive(raw: string, opts: WikiOptions): { display: string; urlTitle: string; } | null {
    if (raw.startsWith(":")) {
        let t = decodePageTitle(raw.replace(/^ *: */, ""));
        if (t.length === 0 || isInvalid(t, true)) return null;
        t = capitalise(t, opts.capitalizeFirst);
        return { display: ":" + t, urlTitle: t };
    }

    const str = raw.replace(/^ *(?:subst|safesubst|raw|msg) *: */i, "");
    if (str.startsWith("#")) return null;

    const intMatch = str.match(/^ *int *: */i);
    if (intMatch) {
        let t = decodePageTitle(str.slice(intMatch[0].length));
        if (t.length === 0 || isInvalid(t, true)) return null;
        t = capitalise(t, opts.capitalizeFirst);
        const full = `MediaWiki:${t}`;
        return { display: full, urlTitle: full };
    }

    let t = decodePageTitle(str);
    if (t.length === 0 || isInvalid(t, true)) return null;
    t = capitalise(t, opts.capitalizeFirst);
    return { display: t, urlTitle: `${opts.templateNamespace}:${t}` };
}

function resolveLinkNaive(brackets: string, rawTitle: string, endBrackets: string, opts: WikiOptions, valid: { isLink: boolean; isTransclusion: boolean; }): ResolvedLink | null {
    let title = rawTitle.trim();
    const { isLink, isTransclusion } = valid;

    let display: string;
    let urlTitle: string;

    if (isTransclusion) {
        const resolved = resolveTransclusionNaive(title, opts);
        if (resolved === null) return null;
        ({ display, urlTitle } = resolved);
    } else {
        title = decodePageTitle(title);
        if (title.length === 0 || isInvalid(title, true)) return null;
        title = capitalise(title, opts.capitalizeFirst);
        display = title;
        urlTitle = title;
    }

    const markdown = composeMarkdown(brackets, endBrackets, display, urlTitle, opts.format, opts.useDiscordLinkEmbeds);
    return { markdown, title: null, apiUrl: null };
}

function resolveLink(brackets: string, rawTitle: string, endBrackets: string, opts: WikiOptions): ResolvedLink | null {
    const valid = validateLink(brackets, rawTitle, endBrackets);
    if (!valid) return null;
    const site = getReadySiteInfo(opts.format);
    if (!site) {
        getSiteInfo(opts.format);
        return resolveLinkNaive(brackets, rawTitle, endBrackets, opts, valid);
    }
    return resolveLinkSite(brackets, rawTitle, endBrackets, opts, site, valid);
}

type Segment = string | { original: string; resolved: ResolvedLink | null; };

// Batch one existence query per wiki, returns existing titles keyed by API URL
async function resolveExistence(segments: Segment[]): Promise<Map<string, Set<string>>> {
    const titlesByApi = new Map<string, string[]>();
    for (const segment of segments) {
        if (typeof segment === "string" || !segment.resolved) continue;
        const { title, apiUrl } = segment.resolved;
        if (title == null || apiUrl == null) continue;

        let titles = titlesByApi.get(apiUrl);
        if (!titles) titlesByApi.set(apiUrl, titles = []);
        titles.push(title);
    }

    const existing = new Map<string, Set<string>>();
    await Promise.all([...titlesByApi].map(async ([apiUrl, titles]) => {
        existing.set(apiUrl, await getExistingTitles(apiUrl, titles));
    }));
    return existing;
}

// Split content into literal/protected text and resolved links
function resolveSegments(content: string, opts: WikiOptions): Segment[] {
    const segments: Segment[] = [];
    let lastIndex = 0;

    for (const m of content.matchAll(PROTECTED_OR_LINK)) {
        const matchText = m[0];
        const start = m.index;
        segments.push(content.slice(lastIndex, start));
        lastIndex = start + matchText.length;

        // Protected regions don't have capture group 2 ([[ or {{) and are kept verbatim
        if (!m[2]) {
            segments.push(matchText);
            continue;
        }

        let resolved: ResolvedLink | null = null;
        try {
            resolved = resolveLink(m[2], m[3], m[4], opts);
        } catch (e) {
            logger.warn("resolveLink threw:", e);
            resolved = null;
        }
        segments.push({ original: matchText, resolved });
    }
    segments.push(content.slice(lastIndex));
    return segments;
}

// Warm the existence cache for a draft so the send doesn't block on the check
export async function prefetchExistence(content: string, opts: WikiOptions): Promise<void> {
    if (!opts.onlyLinkExisting) return;
    if (!content || (!content.includes("[[") && !content.includes("{{"))) return;
    await resolveExistence(resolveSegments(content, opts));
}

// Replace [[wiki]] / {{template}} syntax in a message with markdown links
export async function transformWikiLinks(content: string, opts: WikiOptions): Promise<string> {
    if (!content || (!content.includes("[[") && !content.includes("{{"))) return content;

    const segments = resolveSegments(content, opts);

    // Opt-in: drop links to nonexistent pages (sends titles to the wiki)
    const existing = opts.onlyLinkExisting ? await resolveExistence(segments) : null;

    return segments.map(segment => {
        if (typeof segment === "string") return segment;
        const { original, resolved } = segment;
        if (!resolved) return original;
        if (existing && resolved.title != null && resolved.apiUrl != null
            && !existing.get(resolved.apiUrl)?.has(resolved.title)) {
            return original;
        }
        return resolved.markdown;
    }).join("");
}
