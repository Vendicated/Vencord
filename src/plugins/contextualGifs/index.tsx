/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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
import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import { ContextMenuApi, Menu, React, Toasts, showToast, AuthenticationStore } from "@webpack/common";
import { copyToClipboard } from "@utils/clipboard";
import "./style.css";

const PLUGIN_ID = "ContextualGifs";
const fail = (...args: unknown[]) => console.error(`[${PLUGIN_ID}]`, ...args);

const DISCORD_ATTACHMENT_RE = /^https:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/attachments\//i;
const DISCORD_EXTERNAL_PROXY_RE = /^https:\/\/(?:images-ext-\d+|media)\.discordapp\.(?:net|com)\/external\//i;
const MEDIA_EXT_RE = /\.(?:gif|gifv|mp4|webm|webp|png|jpe?g)(?:[?#]|$)/i;

interface MediaInfo {
    kind: "attachment" | "external";
    attachmentUrl?: string;
    originalUrl?: string | null;
    discordUrl?: string | null;
    ranked?: Record<string, unknown>[];
}

function toast(message: string, type: "info" | "success" | "error" = "info") {
    const toastType = type === "success" ? Toasts.Type.SUCCESS : type === "error" ? Toasts.Type.FAILURE : Toasts.Type.MESSAGE;
    showToast(message, toastType);
}

function getToken(): string {
    const token = (AuthenticationStore as unknown as { getToken(): string | undefined; }).getToken();
    if (!token) throw new Error("Could not find Discord auth token.");
    return token;
}

function isDiscordAttachmentUrl(url: unknown): url is string {
    return typeof url === "string" && DISCORD_ATTACHMENT_RE.test(url);
}

function isDiscordExternalProxyUrl(url: unknown): url is string {
    return typeof url === "string" && DISCORD_EXTERNAL_PROXY_RE.test(url);
}

function isDiscordUrl(url: string) {
    return /^https:\/\/[^/]*discordapp\.(?:com|net)\//i.test(url);
}

function isHttpUrl(url: string) {
    return /^https?:\/\//i.test(url);
}

function isMediaUrl(url: string) {
    try {
        const u = new URL(url, location.href);
        return MEDIA_EXT_RE.test(u.pathname);
    } catch {
        return MEDIA_EXT_RE.test(url);
    }
}

/**
 * Strips resize parameters (width, height, format, quality) from a Discord attachment URL.
 * Optionally strips the signature parameters (ex, is, hm) when preparing a URL for the refresh-urls API.
 */
function cleanDiscordAttachmentUrl(rawUrl: string, { stripSignature = false } = {}) {
    const u = new URL(rawUrl, location.href);
    u.searchParams.delete("width");
    u.searchParams.delete("height");
    u.searchParams.delete("format");
    u.searchParams.delete("quality");
    if (stripSignature) {
        u.searchParams.delete("ex");
        u.searchParams.delete("is");
        u.searchParams.delete("hm");
    }
    return u.toString();
}

/**
 * Extracts all possible media URLs directly attached to a single DOM element.
 * Checks standard properties (href, src, currentSrc, poster) and CSS background-images.
 * This exhaustive check ensures we catch videos, images, and anchors regardless of how Discord renders them.
 */
function ownUrlsFromElement(el: unknown) {
    const urls: string[] = [];
    const add = (value: unknown) => {
        if (typeof value === "string" && value) {
            try {
                urls.push(new URL(value, location.href).toString());
            } catch { }
        }
    };
    if (!(el instanceof Element)) return urls;
    if (el instanceof HTMLAnchorElement) add(el.href);
    if (el instanceof HTMLImageElement) {
        add(el.src);
        add(el.currentSrc);
    }
    if (el instanceof HTMLVideoElement) {
        add(el.src);
        add(el.currentSrc);
        add(el.poster);
    }
    if (el instanceof HTMLSourceElement) add(el.src);
    add(el.getAttribute("href"));
    add(el.getAttribute("src"));
    add(el.getAttribute("poster"));
    try {
        const bg = getComputedStyle(el).backgroundImage;
        for (const match of bg.matchAll(/url\(["']?(.+?)["']?\)/g)) {
            add(match[1]);
        }
    } catch { }
    return urls;
}

function rectContainsPoint(el: Element, x: number, y: number) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/**
 * Heuristic to determine if we should look inside an element's children for media.
 * We only scan small, visible containers that don't contain too many media elements
 * to avoid scanning the entire document or giant message wrappers.
 */
function canScanDescendants(el: unknown, x: number, y: number) {
    if (!(el instanceof Element)) return false;
    if (!rectContainsPoint(el, x, y)) return false;
    const r = el.getBoundingClientRect();
    if (r.width > 650 || r.height > 650) return false;
    const media = el.querySelectorAll?.("a[href], img[src], video[src], source[src]") ?? [];
    if (media.length > 4) return false;
    return media.length > 0;
}

function scopedUrlsFromElement(el: unknown, x: number, y: number) {
    const urls: string[] = [];
    urls.push(...ownUrlsFromElement(el));
    if (canScanDescendants(el, x, y)) {
        for (const child of (el as Element).querySelectorAll("a[href], img[src], video[src], source[src]")) {
            urls.push(...ownUrlsFromElement(child));
        }
    }
    return urls;
}

function uniqueElements(list: unknown[]) {
    const out: Element[] = [];
    const seen = new Set();
    for (const el of list) {
        if (!(el instanceof Element)) continue;
        if (seen.has(el)) continue;
        seen.add(el);
        out.push(el);
    }
    return out;
}

/**
 * Discord's context menu often intercepts clicks on wrapper elements rather than the actual <img> or <video>.
 * To reliably find what the user clicked on, we get all elements under the cursor (elementsFromPoint)
 * and all elements in the event path, then rank all discovered media URLs by how close they are to the target.
 */
function rankedDomUrlsFromEvent(event: MouseEvent) {
    const pointEls = document.elementsFromPoint(event.clientX, event.clientY);
    const pathEls = (event.composedPath?.() || []).filter(x => x instanceof Element);
    const elements = uniqueElements([...pointEls, ...pathEls]);
    const ranked: Record<string, unknown>[] = [];
    const seen = new Set();
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        for (const url of scopedUrlsFromElement(el, event.clientX, event.clientY)) {
            if (seen.has(url)) continue;
            seen.add(url);
            ranked.push({
                url,
                rank: i,
                tag: el.tagName,
                className: typeof el.className === "string" ? el.className : ""
            });
        }
    }
    return ranked;
}

/**
 * Extracts React Fiber internal properties attached to a DOM element.
 * These properties allow us to traverse the virtual DOM to find component props.
 */
function getReactStuff(el: Record<string, unknown> | null | unknown) {
    if (!el || typeof el !== "object") return [];
    const out: unknown[] = [];
    for (const key of Object.keys(el)) {
        if (key.startsWith("__reactFiber$") || key.startsWith("__reactProps$") || key.startsWith("__reactInternalInstance$")) {
            out.push((el as Record<string, unknown>)[key]);
        }
    }
    return out.filter(Boolean);
}

function looksLikeProviderGifObject(obj: unknown) {
    if (!obj || typeof obj !== "object") return false;
    const url = (obj as Record<string, unknown>).url;
    if (typeof url !== "string") return false;
    if (!isHttpUrl(url)) return false;
    if (isDiscordUrl(url)) return false;
    return true;
}

/**
 * Performs a shallow Breadth-First Search (BFS) on a React node's props/state
 * to find an object that looks like a Tenor/Giphy provider object.
 * Capped at 120 visits and depth 3 to prevent performance issues.
 */
function extractProviderUrlShallow(root: unknown) {
    const queue = [{ value: root, depth: 0 }];
    const seen = new Set();
    let visited = 0;
    while (queue.length && visited++ < 120) {
        const { value, depth } = queue.shift()!;
        if (!value || typeof value !== "object") continue;
        if (seen.has(value)) continue;
        seen.add(value);
        if (looksLikeProviderGifObject(value)) return (value as Record<string, unknown>).url as string;
        if (depth >= 3) continue;
        for (const key of Object.keys(value)) {
            if (["children", "_owner", "owner", "return", "child", "sibling", "alternate", "stateNode", "ref"].includes(key)) continue;
            const next = (value as Record<string, unknown>)[key];
            if (!next || typeof next !== "object") continue;
            if (Array.isArray(next) && next.length > 3) continue;
            queue.push({ value: next, depth: depth + 1 });
        }
    }
    return null;
}

/**
 * For external GIFs (like Tenor), Discord proxies them via images-ext.
 * To get the *original* Tenor/Giphy link, we crawl up the React Fiber tree
 * of the clicked element to find the provider object in the component props.
 */
function findOriginalGifUrlFromReact(event: MouseEvent) {
    const pointEls = document.elementsFromPoint(event.clientX, event.clientY);
    const pathEls = (event.composedPath?.() || []).filter(x => x instanceof Element);
    const elements = uniqueElements([...pointEls, ...pathEls]).slice(0, 14);
    for (const el of elements) {
        const reactThings = getReactStuff(el);
        for (const thing of reactThings) {
            const candidates: unknown[] = [];
            type ReactFiberNode = { memoizedProps?: unknown, pendingProps?: unknown, return?: unknown; };
            let fiber = thing as ReactFiberNode | null | undefined;
            let depth = 0;
            while (fiber && depth++ < 7) {
                candidates.push(fiber.memoizedProps);
                candidates.push(fiber.pendingProps);
                fiber = fiber.return as ReactFiberNode | null | undefined;
            }
            for (const candidate of candidates) {
                const url = extractProviderUrlShallow(candidate);
                if (url) return url;
            }
        }
    }
    return null;
}

/**
 * Fallback to decode the original URL directly from Discord's external proxy URL format
 * if React Fiber extraction fails.
 */
function decodeDiscordExternalProxyUrl(proxyUrl: string) {
    const u = new URL(proxyUrl, location.href);
    if (!isDiscordExternalProxyUrl(u.toString())) return null;
    const decodedPath = decodeURIComponent(u.pathname);
    const marker = "/external/";
    const idx = decodedPath.indexOf(marker);
    if (idx === -1) return null;
    const afterExternal = decodedPath.slice(idx + marker.length);
    const parts = afterExternal.split("/").filter(Boolean);
    parts.shift(); // Remove proxy hash/signature
    const schemeIndex = parts.findIndex(p => p === "https" || p === "http");
    if (schemeIndex === -1) {
        const maybeEncoded = decodeURIComponent(afterExternal);
        const match = maybeEncoded.match(/https?:\/\/.+$/);
        return match?.[0] ?? null;
    }
    const beforeScheme = parts.slice(0, schemeIndex).join("/");
    const scheme = parts[schemeIndex];
    const rest = parts.slice(schemeIndex + 1).join("/");
    if (!rest) return null;
    let original = `${scheme}://${rest}`;
    if (beforeScheme.startsWith("?")) original += beforeScheme;
    return original;
}



/**
 * Discord's attachment URLs now include expiry signatures (ex, is, hm).
 * This function hits the Discord API to generate a fresh, unexpired URL for the attachment
 * so the copied/opened link doesn't dead-end for the user.
 */
async function refreshDiscordAttachmentUrl(rawUrl: string) {
    const token = getToken();
    const clean = cleanDiscordAttachmentUrl(rawUrl, { stripSignature: true });
    const urlsToTry = [clean, clean.replace("https://media.discordapp.net/", "https://cdn.discordapp.com/")];
    let lastError: unknown = null;
    for (const url of [...new Set(urlsToTry)]) {
        try {
            const res = await fetch("https://discord.com/api/v9/attachments/refresh-urls", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token
                },
                body: JSON.stringify({ attachment_urls: [url] })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
            const refreshed = json?.refreshed_urls?.[0]?.refreshed || json?.refreshed_urls?.[0]?.refreshed_url || json?.refreshed_urls?.[0]?.url;
            if (!refreshed) throw new Error(`No refreshed URL in response: ${JSON.stringify(json)}`);
            return refreshed;
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError ?? new Error("Refresh failed.");
}

/**
 * Core logic to determine what media the user right-clicked on.
 * Ranks all DOM elements under the cursor and categorizes the hit
 * as either a native Discord attachment or an external proxied GIF.
 */
function findMediaInfoFromEvent(event: MouseEvent): MediaInfo | null {
    const ranked = rankedDomUrlsFromEvent(event);
    const attachmentHit = ranked.find(x => isDiscordAttachmentUrl(x.url) && isMediaUrl(x.url as string));
    const proxyHit = ranked.find(x => isDiscordExternalProxyUrl(x.url) && isMediaUrl(x.url as string));
    const originalFromReact = findOriginalGifUrlFromReact(event);

    if (proxyHit && originalFromReact) {
        return { kind: "external", originalUrl: originalFromReact, discordUrl: proxyHit.url as string, ranked };
    }
    if (attachmentHit && (!proxyHit || (attachmentHit.rank as number) <= (proxyHit.rank as number))) {
        return { kind: "attachment", attachmentUrl: attachmentHit.url as string, ranked };
    }
    if (proxyHit) {
        return { kind: "external", originalUrl: decodeDiscordExternalProxyUrl(proxyHit.url as string), discordUrl: proxyHit.url as string, ranked };
    }
    if (originalFromReact) {
        return { kind: "external", originalUrl: originalFromReact, discordUrl: null, ranked };
    }
    return null;
}

async function copyAttachmentRaw(info: MediaInfo) {
    if (!info.attachmentUrl) throw new Error("No attachment URL detected.");
    const url = cleanDiscordAttachmentUrl(info.attachmentUrl, { stripSignature: false });
    copyToClipboard(url);
    toast("Copied Link", "success");
    return url;
}

async function copyAttachmentSafe(info: MediaInfo) {
    if (!info.attachmentUrl) throw new Error("No attachment URL detected.");
    toast("Refreshing...");
    const url = await refreshDiscordAttachmentUrl(info.attachmentUrl);
    copyToClipboard(url);
    toast("Copied Safe Link", "success");
    return url;
}

async function openAttachmentRaw(info: MediaInfo) {
    if (!info.attachmentUrl) throw new Error("No attachment URL detected.");
    const url = cleanDiscordAttachmentUrl(info.attachmentUrl, { stripSignature: false });
    window.open(url, "_blank", "noopener,noreferrer");
    toast("Opened Link", "success");
    return url;
}

async function openAttachmentSafe(info: MediaInfo) {
    if (!info.attachmentUrl) throw new Error("No attachment URL detected.");
    toast("Refreshing...");
    const url = await refreshDiscordAttachmentUrl(info.attachmentUrl);
    window.open(url, "_blank", "noopener,noreferrer");
    toast("Opened Safe Link", "success");
    return url;
}

async function copyExternalOriginal(info: MediaInfo) {
    if (!info.originalUrl) throw new Error("No original provider URL detected.");
    copyToClipboard(info.originalUrl);
    toast("Copied Link", "success");
    return info.originalUrl;
}

async function openExternalOriginal(info: MediaInfo) {
    if (!info.originalUrl) throw new Error("No original provider URL detected.");
    window.open(info.originalUrl, "_blank", "noopener,noreferrer");
    toast("Opened Link", "success");
    return info.originalUrl;
}

async function copyExternalDiscord(info: MediaInfo) {
    if (!info.discordUrl) throw new Error("No Discord proxy URL detected.");
    copyToClipboard(info.discordUrl);
    toast("Copied Discord Link", "success");
    return info.discordUrl;
}

async function openExternalDiscord(info: MediaInfo) {
    if (!info.discordUrl) throw new Error("No Discord proxy URL detected.");
    window.open(info.discordUrl, "_blank", "noopener,noreferrer");
    toast("Opened Discord Link", "success");
    return info.discordUrl;
}

let lastContextEvent: MouseEvent | null = null;

/**
 * Recursively walks the context menu tree to find native Discord menu items (like "Copy Link").
 * Once found, it completely swaps the native item out with our custom button group in the exact same spot.
 * This prevents duplicate link buttons and ensures our buttons are natively positioned.
 */
function replaceGroupWithAnyId(children: (React.ReactElement | null)[], targetIds: string[], newGroup: React.ReactElement): boolean {
    let replaced = false;
    
    function walk(nodes: (React.ReactElement | null)[]) {
        for (let i = 0; i < nodes.length; i++) {
            const child = nodes[i];
            if (!child) continue;
            const props = child.props as Record<string, unknown>;
            if (typeof props?.id === "string" && targetIds.includes(props.id)) {
                if (!replaced) {
                    nodes.splice(i, 1, newGroup);
                    replaced = true;
                } else {
                    nodes.splice(i, 1);
                    i--;
                }
            } else if (props?.children) {
                const nested = Array.isArray(props.children) ? props.children : [props.children];
                walk(nested as (React.ReactElement | null)[]);
            }
        }
    }

    walk(children);
    return replaced;
}

function hasTargetPrefixInTree(element: React.ReactElement | null, targetPrefix: string): boolean {
    if (!element) return false;
    const props = element.props as Record<string, unknown>;
    if (typeof props?.id === "string" && props.id.startsWith(targetPrefix)) return true;
    if (props?.children) {
        const nested = Array.isArray(props.children) ? props.children : [props.children];
        return nested.some(n => hasTargetPrefixInTree(n as React.ReactElement | null, targetPrefix));
    }
    return false;
}

/**
 * Fallback insertion method for menus (like the Message context menu for Tenor GIFs)
 * where a native image link doesn't exist to swap out. Finds the Apps or Developer mode blocks
 * and securely anchors our buttons just above them, preventing them from falling to the absolute rock-bottom.
 */
function insertBeforeGroupWithIdPrefix(children: (React.ReactElement | null)[], targetPrefixes: string[], newGroup: React.ReactElement): boolean {
    for (let i = 0; i < children.length; i++) {
        const found = targetPrefixes.some(prefix => hasTargetPrefixInTree(children[i], prefix));
        if (found) {
            children.splice(i, 0, newGroup);
            return true;
        }
    }
    return false;
}

function buildMenuItems(info: MediaInfo, close?: () => void) {
    const run = (fn: (i: MediaInfo) => Promise<unknown>) => async () => {
        close?.();
        try {
            await fn(info);
        } catch (e) {
            fail("Action failed:", e);
            toast("Action failed", "error");
        }
    };

    const attachmentItems = [
        <Menu.MenuItem key="copy-link" id="cgifs-copy-link" label="Copy Link" action={run(copyAttachmentRaw)} />,
        <Menu.MenuItem key="copy-safe" id="cgifs-copy-safe-link" className="cgifs-bordered-item" label="Copy Safe Link" action={run(copyAttachmentSafe)} />,
        <Menu.MenuItem key="open-link" id="cgifs-open-link" label={<span style={{ color: "#8ca0d9" }}>Open Link</span>} action={run(openAttachmentRaw)} />,
        <Menu.MenuItem key="open-safe" id="cgifs-open-safe-link" className="cgifs-bordered-item" label={<span style={{ color: "#8ca0d9" }}>Open Safe Link</span>} action={run(openAttachmentSafe)} />
    ];

    const externalItems = [
        <Menu.MenuItem key="ext-copy" id="cgifs-copy-link" className="cgifs-bordered-item" label="Copy Original Link" action={run(copyExternalOriginal)} disabled={!info.originalUrl} />,
        <Menu.MenuItem key="ext-discord" id="cgifs-copy-discord-link" label="Copy Discord Link" action={run(copyExternalDiscord)} disabled={!info.discordUrl} />,
        <Menu.MenuItem key="ext-open-orig" id="cgifs-open-orig-link" className="cgifs-bordered-item" label={<span style={{ color: "#8ca0d9" }}>Open Original Link</span>} action={run(openExternalOriginal)} disabled={!info.originalUrl} />,
        <Menu.MenuItem key="ext-open-discord" id="cgifs-open-discord-link" label={<span style={{ color: "#8ca0d9" }}>Open Discord Link</span>} action={run(openExternalDiscord)} disabled={!info.discordUrl} />
    ];

    return (
        <Menu.MenuGroup key="contextual-gifs">
            {info.kind === "attachment" ? attachmentItems : externalItems}
        </Menu.MenuGroup>
    );
}

function ContextualGifsMenu({ info, onClose, ...props }: { info: MediaInfo, onClose?: () => void; } & Record<string, unknown>) {
    const close = onClose || ContextMenuApi.closeContextMenu || (() => { });
    return (
        <Menu.Menu navId="cgifs" className="cgifs-menu" onClose={close} aria-label="GIF" {...props}>
            {buildMenuItems(info, close)}
        </Menu.Menu>
    );
}

/**
 * Standalone menu spawner for environments where Discord completely lacks a native context menu
 * (e.g., the Tenor GIF picker and Expression browser). 
 * Intercepts the right-click and forcefully renders our own React context menu.
 */
function captureContextEvent(event: MouseEvent) {
    lastContextEvent = event;

    const path = event.composedPath();
    const inPicker = path.some(el => {
        if (!(el instanceof Element)) return false;
        const cls = el.getAttribute("class");
        return cls && /picker|browser/i.test(cls);
    });

    if (inPicker) {
        const info = findMediaInfoFromEvent(event);
        if (info) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            if (ContextMenuApi.openContextMenu) {
                ContextMenuApi.openContextMenu(event as unknown as React.MouseEvent, (props) => <ContextualGifsMenu info={info} {...(props as Record<string, unknown>)} />);
            } else if (ContextMenuApi.openContextMenuLazy) {
                ContextMenuApi.openContextMenuLazy(event as unknown as React.MouseEvent, async () => (props) => <ContextualGifsMenu info={info} {...(props as Record<string, unknown>)} />);
            }
        }
    }
}

/**
 * Core injection routine for standard native context menus ("image-context", "message").
 * Integrates our enhanced buttons seamlessly by replacing native image links, 
 * or gracefully falling back to a clean position if no native image link exists.
 */
function injectContextMenu(children: (React.ReactElement | null)[]) {
    if (!lastContextEvent) return;
    const info = findMediaInfoFromEvent(lastContextEvent);
    if (!info) return;

    const newGroup = buildMenuItems(info) as unknown as React.ReactElement;
    
    // 1. Swap directly with native image link buttons (leaving no duplicates)
    let inserted = replaceGroupWithAnyId(children, ["copy-native-link", "open-native-link"], newGroup);
    
    // 2. If no native image link exists (e.g. Tenor GIFs in chat), anchor below message actions
    if (!inserted) {
        inserted = insertBeforeGroupWithIdPrefix(children, ["message-apps", "devmode-copy-id"], newGroup);
    }
    
    if (!inserted) {
        children.push(newGroup);
    }
}

export default definePlugin({
    name: "ContextualGifs",
    description: "Context menu options to get original GIF links and refresh expired attachments.",
    authors: [Devs.KRWCLASSIC],
    start() {
        document.addEventListener("contextmenu", captureContextEvent, true);
    },
    stop() {
        document.removeEventListener("contextmenu", captureContextEvent, true);
    },
    contextMenus: {
        "image-context": injectContextMenu,
        "message": injectContextMenu,
        "expression-picker": injectContextMenu
    }
});
