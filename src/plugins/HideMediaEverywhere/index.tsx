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

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, Forms, Menu, MessageStore, React } from "@webpack/common";

const HIDDEN_CLASS      = "vc-hide-user-gifs-hidden";
const PLACEHOLDER_CLASS = "vc-hide-user-gifs-placeholder";
const STYLE_ID          = "vc-hide-user-gifs-style";


const settings = definePluginSettings({
    blockedUrls: {
        type: OptionType.STRING,
        description: "Comma-separated GIF/media URLs that are hidden",
        default: ""
    },
    placeholderUrl: {
        type: OptionType.STRING,
        description: "Stores the placeholder image as a data URI (set via the file picker below).",
        default: "",
        hidden: true
    },
    placeholderImage: {
        type: OptionType.COMPONENT,
        description: "Shown in place of hidden media. Pick any image from your computer.",
        component: () => {
            const [preview, setPreview] = React.useState<string | null>(settings.store.placeholderUrl || null);

            function pickFile() {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = e => {
                        const dataUrl = e.target?.result as string;
                        settings.store.placeholderUrl = dataUrl;
                        cachedPlaceholderSrc = dataUrl;
                        updateRenderedPlaceholders();
                        setPreview(dataUrl);
                    };
                    reader.readAsDataURL(file);
                };
                input.click();
            }

            function clear() {
                settings.store.placeholderUrl = "";
                cachedPlaceholderSrc = null;
                updateRenderedPlaceholders();
                setPreview(null);
            }

            return (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>
                        <Forms.FormTitle>Placeholder Image</Forms.FormTitle>
                        <Forms.FormText>Shown in place of hidden media. Pick any image from your computer.</Forms.FormText>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                            onClick={pickFile}
                            style={{ padding: "6px 14px", borderRadius: "4px", border: "none", background: "var(--brand-500, #5865f2)", color: "white", cursor: "pointer", fontWeight: "bold" }}
                        >
                            Choose File
                        </button>
                        {preview && (
                            <button
                                onClick={clear}
                                style={{ padding: "6px 14px", borderRadius: "4px", border: "none", background: "var(--status-danger, #ed4245)", color: "white", cursor: "pointer" }}
                            >
                                Clear
                            </button>
                        )}
                        {preview
                            ? <span style={{ color: "var(--text-positive, #3ba55c)", fontSize: "13px" }}>✓ Image loaded</span>
                            : <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>No image selected, using default placeholder</span>
                        }
                    </div>
                    {preview && (
                        <img src={preview} alt="placeholder preview" style={{ maxWidth: "150px", maxHeight: "100px", borderRadius: "4px", objectFit: "contain" }} />
                    )}
                </div>
            );
        }
    }
});

// these selectors find message elements and media inside them
const CHAT_MSG_PREFIX = "chat-messages___chat-messages-";
const NO_LIST_PREFIX  = "NO_LIST___";

const ALL_MSG_SELECTOR = `[data-list-item-id^='${CHAT_MSG_PREFIX}'],[data-list-item-id^='${NO_LIST_PREFIX}']`;

const MEDIA_SELECTORS = [
    "[class*='embed']",
    "[class*='imageWrapper']",
    "[class*='mediaAttachmentsContainer']",
    "[class*='visualMediaItemContainer']",
    "[class*='oneByOneGrid']",
    "[class*='mosaicItem']",
    "[class*='attachment']",
].join(",");

const EMBED_SELECTORS = [
    "[class*='embed']",
    "[class*='imageWrapper']",
    "[class*='mediaAttachmentsContainer']",
    "[class*='visualMediaItemContainer']",
].join(",");

// normalize URLs so the same image always matches even if Discord gives it a slightly different URL.
// we cache results so we're not re-parsing the same URLs over and over
const NORM_CACHE_MAX = 500;
const normCache = new Map<string, string>();

// when a cache gets full, just drop the oldest entry (Maps keep insertion order so this works)
function evictOldest(map: Map<any, any>) {
    map.delete(map.keys().next().value);
}

function normalizeMediaUrl(url: string): string {
    let n = normCache.get(url);
    if (n !== undefined) return n;
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        // Discord attachment URLs look like /attachments/{channel_id}/{attachment_id}/{filename}
        // the attachment_id changes every time the same file is re-uploaded, so we strip it.
        // this way "image.png" sent twice in the same channel still matches.
        if (parts[0] === "attachments" && parts.length >= 4) parts.splice(2, 1);
        n = (parsed.host + "/" + parts.join("/")).toLowerCase();
    } catch {
        n = url;
    }
    if (normCache.size >= NORM_CACHE_MAX) evictOldest(normCache);
    normCache.set(url, n);
    return n;
}

function normalizeUrls(urls: string[]): string[] {
    return urls.map(normalizeMediaUrl);
}

// in-memory set of blocked URLs so we're not parsing settings strings on every message
let blockedUrlCache = new Set<string>();

function rebuildBlockedCache() {
    blockedUrlCache = new Set(
        settings.store.blockedUrls
            .split(",")
            .map((u: string) => normalizeMediaUrl(u.trim()))
            .filter(Boolean)
    );
}

function saveAndSync(urls: Set<string>) {
    blockedUrlCache = urls;
    settings.store.blockedUrls = [...urls].join(",");
}

function isAnyUrlBlocked(urls: string[]): boolean {
    return urls.some(u => blockedUrlCache.has(normalizeMediaUrl(u)));
}

function blockUrls(rawUrls: string[]) {
    const next = new Set(blockedUrlCache);
    for (const u of normalizeUrls(rawUrls)) next.add(u);
    saveAndSync(next);
    scanMessages();
}

function unblockUrls(rawUrls: string[]) {
    const next = new Set(blockedUrlCache);
    for (const u of normalizeUrls(rawUrls)) next.delete(u);
    saveAndSync(next);
    // when unblocking we only need to re-check messages that are already hidden, not everything
    scanHiddenMessages();
}

// search results don't go through MessageStore, so we cache them ourselves when we intercept the XHR
const SEARCH_CACHE_MAX = 200;
const searchMessageCache = new Map<string, any>();

function setSearchCache(id: string, msg: any) {
    if (searchMessageCache.size >= SEARCH_CACHE_MAX) evictOldest(searchMessageCache);
    searchMessageCache.set(id, msg);
}

function getMessageMediaUrls(message: any): string[] {
    const urls: string[] = [];
    for (const att of message?.attachments ?? []) {
        if (att?.url)       urls.push(att.url);
        if (att?.proxy_url) urls.push(att.proxy_url);
    }
    for (const embed of message?.embeds ?? []) {
        if (embed?.url)               urls.push(embed.url);
        if (embed?.image?.url)        urls.push(embed.image.url);
        if (embed?.image?.proxy_url)  urls.push(embed.image.proxy_url);
        if (embed?.video?.url)        urls.push(embed.video.url);
        if (embed?.thumbnail?.url)    urls.push(embed.thumbnail.url);
        if (embed?.thumbnail?.proxy_url) urls.push(embed.thumbnail.proxy_url);
    }
    return urls;
}

function messageHasBlockedMedia(message: any): boolean {
    return getMessageMediaUrls(message).some(u => blockedUrlCache.has(normalizeMediaUrl(u)));
}

// Channel lookup cache to avoid scanning the whole MessageStore repeatedly
const CHANNEL_CACHE_MAX = 300;
const channelForMessage = new Map<string, string>();

function findInMessageStore(messageId: string): any | null {
    const cached = channelForMessage.get(messageId);
    if (cached) return MessageStore.getMessage(cached, messageId) ?? null;

    const store = MessageStore as any;
    const channelMap: Map<string, any> | Record<string, any> =
        store._channelMessages ?? store.__channelMessages;
    if (!channelMap) return null;

    const entries = channelMap instanceof Map
        ? channelMap.entries()
        : Object.entries(channelMap);

    for (const [channelId] of entries) {
        const msg = MessageStore.getMessage(channelId, messageId);
        if (msg) {
            if (channelForMessage.size >= CHANNEL_CACHE_MAX) evictOldest(channelForMessage);
            channelForMessage.set(messageId, channelId);
            return msg;
        }
    }
    return null;
}

function getMessageFromElement(el: HTMLElement): any | null {
    const rawId = el.dataset.listItemId;
    if (!rawId) return null;

    if (rawId.startsWith(CHAT_MSG_PREFIX)) {
        const tail = rawId.slice(CHAT_MSG_PREFIX.length);
        const dash = tail.lastIndexOf("-");
        if (dash < 0) return null;
        return MessageStore.getMessage(tail.slice(0, dash), tail.slice(dash + 1)) ?? null;
    }

    if (rawId.startsWith(NO_LIST_PREFIX)) {
        const messageId = rawId.slice(NO_LIST_PREFIX.length);
        return searchMessageCache.get(messageId) ?? findInMessageStore(messageId);
    }

    return null;
}

function isMessageElement(id: string): boolean {
    return id.startsWith(CHAT_MSG_PREFIX) || id.startsWith(NO_LIST_PREFIX);
}

// ─── DOM hide / unhide ────────────────────────────────────────────────────────
let cachedPlaceholderSrc: string | null | undefined = undefined;

function getPlaceholderSrc(): string | null {
    if (cachedPlaceholderSrc !== undefined) return cachedPlaceholderSrc;
    // Fallback: read from settings directly if cache was never populated
    const raw = settings.store.placeholderUrl?.trim() || "";
    cachedPlaceholderSrc = raw || null;
    return cachedPlaceholderSrc;
}

function updateRenderedPlaceholders() {
    // Single pass: remove sibling placeholders and restore hidden containers,
    // then re-scan so the correct element type (img vs div) is rendered.
    for (const el of document.querySelectorAll<HTMLElement>(`.${HIDDEN_CLASS}`)) {
        const next = el.nextElementSibling;
        if (next?.classList.contains(PLACEHOLDER_CLASS)) next.remove();
        el.classList.remove(HIDDEN_CLASS);
    }
    // Remove any remaining orphaned placeholders
    for (const el of document.querySelectorAll(`.${PLACEHOLDER_CLASS}`)) el.remove();
    scanMessages();
}

function loadPlaceholder(rescan = true) {
    const raw = settings.store.placeholderUrl?.trim() || "";
    cachedPlaceholderSrc = raw || null; // null = no image, show text instead
    if (rescan) updateRenderedPlaceholders();
}

function hideMediaInsideMessage(el: HTMLElement) {
    const candidates = el.querySelectorAll<HTMLElement>(MEDIA_SELECTORS);
    if (candidates.length === 0) return;

    const src = getPlaceholderSrc();

    // Find the single outermost media wrapper inside the message to hide.
    // Walk UP from each candidate to find the highest ancestor that is still
    // a descendant of el — that way we hide the whole embed/attachment block
    // rather than just an inner container that might not cover the full image.
    const containers = new Set<HTMLElement>();
    for (const element of candidates) {
        if (element.classList.contains(PLACEHOLDER_CLASS)) continue;

        // Walk up until the parent is el itself (or el's direct child)
        let node: HTMLElement = element;
        while (node.parentElement && node.parentElement !== el) {
            node = node.parentElement;
        }
        containers.add(node);
    }

    for (const container of containers) {
        const nextEl = container.nextElementSibling;
        // Already fully hidden with a sibling placeholder — nothing to do
        if (container.classList.contains(HIDDEN_CLASS) && nextEl?.classList.contains(PLACEHOLDER_CLASS)) continue;

        container.classList.add(HIDDEN_CLASS);

        // Remove stale sibling placeholder before inserting fresh one
        if (nextEl?.classList.contains(PLACEHOLDER_CLASS)) nextEl.remove();

        const placeholder = src
            ? Object.assign(document.createElement("img"), { src, referrerPolicy: "no-referrer", className: PLACEHOLDER_CLASS })
            : Object.assign(document.createElement("div"), {
                className: PLACEHOLDER_CLASS,
                textContent: "🚫 Media hidden — set a placeholder image in plugin settings",
            });
        container.insertAdjacentElement("afterend", placeholder);
    }
}

function unhideMediaInsideMessage(el: HTMLElement) {
    // Placeholders are siblings of hidden containers (inserted via insertAdjacentElement("afterend"))
    for (const n of el.querySelectorAll<HTMLElement>(`.${HIDDEN_CLASS}`)) {
        const next = n.nextElementSibling;
        if (next?.classList.contains(PLACEHOLDER_CLASS)) next.remove();
        n.classList.remove(HIDDEN_CLASS);
    }
    // Also clean up any inline placeholders (legacy / edge cases)
    for (const n of el.querySelectorAll(`.${PLACEHOLDER_CLASS}`)) n.remove();
}

function processMessageElement(el: HTMLElement) {
    const isHidden = el.querySelector(`.${HIDDEN_CLASS}`) !== null;

    if (blockedUrlCache.size === 0) {
        if (isHidden) unhideMediaInsideMessage(el);
        return;
    }

    const message = getMessageFromElement(el);
    if (!message) return;

    if (messageHasBlockedMedia(message)) {
        // Always call hideMediaInsideMessage — it skips already-hidden containers
        // internally, so calling it again is safe and catches any newly-loaded media.
        hideMediaInsideMessage(el);
    } else if (isHidden) {
        unhideMediaInsideMessage(el);
    }
}

function scanMessages() {
    for (const el of document.querySelectorAll<HTMLElement>(ALL_MSG_SELECTOR))
        processMessageElement(el);
}

/** Only visit messages that already have hidden containers (fast unblock path). */
function scanHiddenMessages() {
    const seen = new Set<HTMLElement>();
    for (const hidden of document.querySelectorAll<HTMLElement>(`.${HIDDEN_CLASS}`)) {
        // Walk up to the message element
        let node: HTMLElement | null = hidden;
        while (node && !isMessageElement(node.dataset?.listItemId ?? "")) node = node.parentElement;
        if (node && !seen.has(node)) { seen.add(node); processMessageElement(node); }
    }
}

// ─── MutationObserver ─────────────────────────────────────────────────────────
function handleMutations(mutations: MutationRecord[]) {
    if (blockedUrlCache.size === 0) return;

    const toProcess = new Set<HTMLElement>();

    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;

            // Skip placeholder elements we inserted ourselves
            if (node.classList.contains(PLACEHOLDER_CLASS)) continue;

            if (isMessageElement(node.dataset?.listItemId ?? "")) {
                toProcess.add(node);
            } else {
                for (const el of node.querySelectorAll<HTMLElement>(ALL_MSG_SELECTOR))
                    toProcess.add(el);
            }
        }
    }

    if (toProcess.size > 0) {
        // Sweep for orphaned placeholders whose hidden container was replaced by React
        for (const ph of document.querySelectorAll<HTMLElement>(`.${PLACEHOLDER_CLASS}`)) {
            const prev = ph.previousElementSibling;
            if (!prev || !prev.classList.contains(HIDDEN_CLASS)) ph.remove();
        }
    }

    for (const el of toProcess) {
        if (el.querySelector(MEDIA_SELECTORS) !== null)
            processMessageElement(el);
    }
}

// ─── Flux — catch embed updates after initial message send ────────────────────
function handleMessageUpdate({ message }: any) {
    if (!message?.id || !message?.channel_id) return;
    if (blockedUrlCache.size === 0) return;

    if (!getMessageMediaUrls(message).some(u => blockedUrlCache.has(normalizeMediaUrl(u)))) return;

    const els = document.querySelectorAll<HTMLElement>(
        `[data-list-item-id='${CHAT_MSG_PREFIX}${message.channel_id}-${message.id}'],` +
        `[data-list-item-id='${NO_LIST_PREFIX}${message.id}']`
    );
    if (els.length === 0) return;

    for (const el of els) {
        let attempts = 0;
        const tryHide = () => {
            if (!el.isConnected) return;          // element was unmounted — bail out
            attempts++;
            if (el.querySelector(EMBED_SELECTORS)) {
                el.style.visibility = "hidden";
                unhideMediaInsideMessage(el);
                hideMediaInsideMessage(el);
                el.style.visibility = "";
            } else if (attempts < 30) {
                requestAnimationFrame(tryHide);
            }
        };
        requestAnimationFrame(tryHide);
    }
}

// ─── XHR hook — captures search result payloads ───────────────────────────────
let xhrOpenOrig: typeof XMLHttpRequest.prototype.open | null = null;
let xhrSendOrig: typeof XMLHttpRequest.prototype.send | null = null;

function startXhrHook() {
    xhrOpenOrig = XMLHttpRequest.prototype.open;
    xhrSendOrig = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(this: any, method: string, url: string, ...rest: any[]) {
        this._vc_url = url;
        return xhrOpenOrig!.call(this, method, url, ...rest);
    } as any;

    XMLHttpRequest.prototype.send = function(this: any, ...args: any[]) {
        if (this._vc_url?.includes("/messages/search")) {
            this.addEventListener("load", function(this: XMLHttpRequest) {
                try {
                    const data = JSON.parse(this.responseText);
                    for (const group of data?.messages ?? [])
                        for (const msg of group)
                            if (msg?.id) setSearchCache(msg.id, msg);
                    // Only process the search result elements, not the whole chat
                    for (const el of document.querySelectorAll<HTMLElement>(
                        `[data-list-item-id^='${NO_LIST_PREFIX}']`
                    )) processMessageElement(el);
                } catch {}
            });
        }
        return xhrSendOrig!.call(this, ...args);
    } as any;
}

function stopXhrHook() {
    if (xhrOpenOrig) XMLHttpRequest.prototype.open = xhrOpenOrig;
    if (xhrSendOrig) XMLHttpRequest.prototype.send = xhrSendOrig;
    xhrOpenOrig = xhrSendOrig = null;
}

// ─── Context menu ─────────────────────────────────────────────────────────────
const messageContextPatch: NavContextMenuPatchCallback = (children, props) => {
    const message = props?.message;
    if (!message) return;

    const mediaUrls = getMessageMediaUrls(message);
    if (mediaUrls.length === 0) return;

    const blocked = isAnyUrlBlocked(mediaUrls);

    const menuItem = (
        <Menu.MenuItem
            id="vc-hide-gif-toggle"
            label={blocked ? "Unhide this media" : "Hide this media"}
            action={() => { if (blocked) unblockUrls(mediaUrls); else blockUrls(mediaUrls); }}
        />
    );

    const group =
        findGroupChildrenByChildId("copy-text", children) ??
        findGroupChildrenByChildId("copy-link", children);

    if (group) group.push(menuItem);
    else children.push(menuItem);
};

// ─── Plugin ───────────────────────────────────────────────────────────────────
let observer: MutationObserver | null = null;

export default definePlugin({
    name: "HideMediaEverywhere",
    description: "Right-click a GIF/media message to hide that specific media URL everywhere it appears.",
    authors: [Devs.t6rtar],

    settings,

    tags: ["Media", "Privacy", "Utility"],

    contextMenus: { message: messageContextPatch },

    start() {
        rebuildBlockedCache();
        cachedPlaceholderSrc = undefined; // invalidate so updated settings.store is read fresh
        loadPlaceholder(false);  // no messages are hidden yet on startup, skip rescan

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            .${HIDDEN_CLASS}      { display: none !important; }
            .${PLACEHOLDER_CLASS} { display: block; border-radius: 4px; }
            .${PLACEHOLDER_CLASS}:is(img) { width: 200px; height: auto; }
            .${PLACEHOLDER_CLASS}:is(div) { padding: 6px 10px; font-size: 12px; color: var(--text-muted); background: var(--background-secondary); width: fit-content; }
        `;
        document.head.appendChild(style);

        startXhrHook();

        observer = new MutationObserver(handleMutations);
        observer.observe(document.body, { childList: true, subtree: true });

        FluxDispatcher.subscribe("MESSAGE_UPDATE",       handleMessageUpdate);
        FluxDispatcher.subscribe("MESSAGE_EMBED_UPDATE", handleMessageUpdate);

        scanMessages();
    },

    stop() {
        observer?.disconnect();
        observer = null;

        stopXhrHook();
        searchMessageCache.clear();
        channelForMessage.clear();
        normCache.clear();

        FluxDispatcher.unsubscribe("MESSAGE_UPDATE",       handleMessageUpdate);
        FluxDispatcher.unsubscribe("MESSAGE_EMBED_UPDATE", handleMessageUpdate);

        document.getElementById(STYLE_ID)?.remove();
        // Single pass: restore hidden containers and remove their sibling placeholders
        for (const el of document.querySelectorAll<HTMLElement>(`.${HIDDEN_CLASS}`)) {
            const next = el.nextElementSibling;
            if (next?.classList.contains(PLACEHOLDER_CLASS)) next.remove();
            el.classList.remove(HIDDEN_CLASS);
        }
        // Clean up any remaining placeholders not preceded by a hidden container
        for (const el of document.querySelectorAll(`.${PLACEHOLDER_CLASS}`)) el.remove();
    }
});
