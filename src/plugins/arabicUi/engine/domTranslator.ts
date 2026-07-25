/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

import { getArabicByEnglish,getDiscordCoverage } from "./lookup";

const logger = new Logger("ArabicUI.DOM");

const ATTRS = ["aria-label", "aria-placeholder", "aria-description", "placeholder", "title", "alt"] as const;

function shouldSkip(el: Element | null): boolean {
    if (!el) return true;

    if (el.closest("code, pre, script, style, svg, noscript, textarea, [contenteditable='true']"))
        return true;

    if (el.closest('ol[data-list-id="chat-messages"]'))
        return true;
    if (el.closest('[id^="message-content-"]'))
        return true;

    // Role / member-list names: leave as-is
    if (el.closest(
        '[class*="roleName"], [class*="roleRemoveButton"], [class*="roleNameOverflow"], [class*="rolePill"], [class*="memberRoles"], [class*="rolesList"], [data-role-id], [class*="membersGroup"], [class*="membersWrap"], [class*="memberList"], [data-list-id^="members"]'
    ))
        return true;

    return false;
}

function shouldLeaveText(s: string) {
    const hasAr = /[\u0600-\u06FF]/.test(s);
    const hasEn = /[A-Za-z]{3,}/.test(s);
    // Pure Arabic (e.g. already-translated link label) — leave alone
    if (hasAr && !hasEn) return true;
    // Mixed EN+AR: still try translate (Learn-more link tails are stripped in lookup)
    return false;
}

/** Role-like "Name - 12" headers — only after a real translation miss */
function looksLikeRoleCountLabel(s: string) {
    return /^.+?\s*[\u2013\u2014—–-]\s*\d+\s*$/.test(s.trim());
}

function isUserGeneratedOrDynamic(raw: string, el: Element | null): boolean {
    const trimmed = raw.trim();
    if (!trimmed) return true;

    if (/^\d+$/.test(trimmed)) return true;
    if (/\d+,\d+/.test(trimmed)) return true;
    if (/\d+\s+(online|total|members|unread|mentions|online in this channel|total server members|elapsed)/i.test(trimmed)) return true;
    if (/elapsed/i.test(trimmed)) return true;
    if (/(Playing|Listening to|Open conversation with)/i.test(trimmed)) return true;
    if (/, Offline|, Idle|, Online/i.test(trimmed)) return true;
    if (/Server Tag:/i.test(trimmed)) return true;

    if (!el) return false;
    let current: Element | null = el;
    let depth = 0;
    while (current && depth < 8) {
        if (current.hasAttribute("data-user-id") ||
            current.hasAttribute("data-message-author-id") ||
            current.hasAttribute("data-author-id")) {
            return true;
        }

        const listItemId = current.getAttribute("data-list-item-id");
        if (listItemId && (
            listItemId.startsWith("private-channels-") ||
            listItemId.startsWith("guildsnav_") ||
            listItemId.startsWith("channels___")
        )) {
            return true;
        }

        const { className } = current;
        if (typeof className === "string" && className) {
            const lowerClass = className.toLowerCase();
            if (lowerClass.includes("username") ||
                lowerClass.includes("nickname") ||
                lowerClass.includes("guildname") ||
                lowerClass.includes("channelname") ||
                lowerClass.includes("rolename") ||
                lowerClass.includes("rolepill") ||
                lowerClass.includes("memberroles") ||
                lowerClass.includes("roleslist") ||
                lowerClass.includes("messagecontent") ||
                // Do NOT skip markup_ — chat messages already blocked via
                // #message-content- / chat list. Server home tips use markup too.
                lowerClass.includes("customstatus") ||
                lowerClass.includes("memberswrap") ||
                lowerClass.includes("membersgroup") ||
                lowerClass.includes("memberlist")) {
                return true;
            }
        }
        current = current.parentElement;
        depth++;
    }

    return false;
}

function translateText(raw: string, el: Element | null): string | null {
    if (!raw || !raw.trim()) return null;
    if (shouldLeaveText(raw)) return null;

    // 1. Try exact dictionary/engine lookup first.
    // If we have an authoritative translation for this string, translate it regardless of parent card flags.
    const ar = getArabicByEnglish(raw);
    if (ar && ar !== raw) {
        const lead = raw.match(/^\s*/)?.[0] ?? "";
        const trail = raw.match(/\s*$/)?.[0] ?? "";
        return lead + ar + trail;
    }

    // 2. If missed, check if it's dynamic/user-generated before logging
    if (isUserGeneratedOrDynamic(raw, el)) return null;

    // "Moderator — 12" style role headers (after chrome/count patterns miss)
    if (looksLikeRoleCountLabel(raw)) return null;

    if (typeof window !== "undefined" && /[A-Za-z]{2,}/.test(raw)) {
        const trimmed = raw.trim();
        if (trimmed.length >= 2) {
            const untranslated = (window as any).untranslatedArabicUiStrings || new Set();
            untranslated.add(trimmed);
            (window as any).untranslatedArabicUiStrings = untranslated;
        }
    }

    return null;
}

function translateElementAttrs(el: Element) {
    for (const attr of ATTRS) {
        if (!el.hasAttribute(attr)) continue;
        const val = el.getAttribute(attr);
        if (!val) continue;
        const ar = translateText(val, el);
        if (ar != null) el.setAttribute(attr, ar);
    }
}

function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
        const parent = (node as Text).parentElement;
        if (shouldSkip(parent)) return;
        const ar = translateText(node.nodeValue ?? "", parent);
        if (ar != null) node.nodeValue = ar;
        return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (shouldSkip(el)) return;

    translateElementAttrs(el);
    for (const child of Array.from(node.childNodes))
        walk(child);
}

let observer: MutationObserver | null = null;
let scheduled = false;
const pendingRoots = new Set<Node>();
let active = false;

function flush() {
    scheduled = false;
    const roots = [...pendingRoots];
    pendingRoots.clear();
    for (const root of roots) {
        try {
            walk(root);
        } catch (e) {
            logger.error("walk failed", e);
        }
    }
}

function schedule(root: Node) {
    pendingRoots.add(root);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(flush);
}

export function installDomTranslator() {
    if (active || typeof document === "undefined") return;
    active = true;

    if (typeof window !== "undefined") {
        (window as any).getUntranslatedArabicUiStrings = () => {
            const set = (window as any).untranslatedArabicUiStrings;
            if (!set || set.size === 0) return [];
            return Array.from(set);
        };
        (window as any).clearUntranslatedArabicUiStrings = () => {
            (window as any).untranslatedArabicUiStrings = new Set();
            return "Cleared.";
        };
    }

    const cov = getDiscordCoverage();
    logger.info(`DOM translator on (englishPhrases=${cov.englishPhrases}, exact-match-only)`);

    if (document.body) walk(document.body);

    observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type === "characterData") {
                schedule(m.target);
                continue;
            }
            if (m.type === "attributes" && m.target.nodeType === Node.ELEMENT_NODE) {
                schedule(m.target);
                continue;
            }
            for (const node of m.addedNodes)
                schedule(node);
        }
    });

    observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...ATTRS],
    });
}

export function uninstallDomTranslator() {
    observer?.disconnect();
    observer = null;
    pendingRoots.clear();
    scheduled = false;
    active = false;
    logger.info("DOM translator off");
}
