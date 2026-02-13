/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

const EXPLICIT_FLAG = 1 << 4; // 16 — IS_EXPLICIT
const MESSAGE_URL_RE = /\/api\/v\d+\/channels\/\d+\/messages/;

function stripAttachmentFlags(attachments: any[]) {
    if (!Array.isArray(attachments)) return;
    for (const att of attachments) {
        if (att && typeof att.flags === "number" && (att.flags & EXPLICIT_FLAG)) {
            att.flags &= ~EXPLICIT_FLAG;
        }
    }
}

function patchMessage(msg: any) {
    if (!msg) return;
    stripAttachmentFlags(msg.attachments);
}

function patchEvent(event: any) {
    if (!event) return;
    patchMessage(event);
    patchMessage(event.message);
    if (Array.isArray(event.messages)) {
        for (const msg of event.messages) patchMessage(msg);
    }
}

// Discord sends X-Super-Properties which includes age verification state.
// Server returns 403 for NSFW channel messages if not verified.
// We hijack GET requests to /messages endpoints with a clean fetch()
// that only sends the Authorization header.

let xhrPatched = false;
let nativeXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
let nativeXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
let nativeXHRSetHeader: typeof XMLHttpRequest.prototype.setRequestHeader | null = null;

function patchXHR() {
    if (xhrPatched) return;
    xhrPatched = true;

    nativeXHROpen = XMLHttpRequest.prototype.open;
    nativeXHRSend = XMLHttpRequest.prototype.send;
    nativeXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
        (this as any)._nsfwUrl = String(url);
        (this as any)._nsfwMethod = method;
        (this as any)._nsfwHeaders = {};
        return nativeXHROpen!.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
        if ((this as any)._nsfwHeaders) (this as any)._nsfwHeaders[name] = value;
        return nativeXHRSetHeader!.call(this, name, value);
    };

    XMLHttpRequest.prototype.send = function (body?: any) {
        const url = (this as any)._nsfwUrl;
        const xhr = this;

        if (url && MESSAGE_URL_RE.test(url) && (this as any)._nsfwMethod === "GET") {
            const token = (this as any)._nsfwHeaders?.["Authorization"];
            if (token) {
                fetch(url, {
                    method: "GET",
                    headers: { Authorization: token },
                })
                    .then(async resp => {
                        let text = await resp.text();

                        try {
                            const json = JSON.parse(text);
                            const msgs = Array.isArray(json) ? json : json?.messages?.flat?.() ?? [];
                            for (const msg of msgs) patchMessage(msg);
                            text = JSON.stringify(json);
                        } catch { }

                        const headerLines: string[] = [];
                        resp.headers.forEach((v, k) => headerLines.push(k + ": " + v));

                        Object.defineProperty(xhr, "readyState", { value: 4, configurable: true });
                        Object.defineProperty(xhr, "status", { value: resp.status, configurable: true });
                        Object.defineProperty(xhr, "statusText", { value: resp.statusText, configurable: true });
                        Object.defineProperty(xhr, "responseText", { value: text, configurable: true });
                        Object.defineProperty(xhr, "response", { value: text, configurable: true });
                        Object.defineProperty(xhr, "responseURL", { value: url, configurable: true });
                        Object.defineProperty(xhr, "getAllResponseHeaders", {
                            value: () => headerLines.join("\r\n"),
                            configurable: true,
                        });
                        Object.defineProperty(xhr, "getResponseHeader", {
                            value: (h: string) => resp.headers.get(h),
                            configurable: true,
                        });

                        xhr.dispatchEvent(new Event("readystatechange"));
                        xhr.dispatchEvent(new ProgressEvent("load"));
                        xhr.dispatchEvent(new ProgressEvent("loadend"));
                        if (typeof (xhr as any).onreadystatechange === "function") (xhr as any).onreadystatechange();
                        if (typeof (xhr as any).onload === "function") (xhr as any).onload();
                    })
                    .catch(() => {
                        nativeXHRSend!.call(xhr, body);
                    });
                return;
            }
        }

        return nativeXHRSend!.call(this, body);
    };
}

function unpatchXHR() {
    if (!xhrPatched) return;
    if (nativeXHROpen) XMLHttpRequest.prototype.open = nativeXHROpen as any;
    if (nativeXHRSend) XMLHttpRequest.prototype.send = nativeXHRSend;
    if (nativeXHRSetHeader) XMLHttpRequest.prototype.setRequestHeader = nativeXHRSetHeader;
    xhrPatched = false;
}

let userPatchInterval: ReturnType<typeof setInterval> | null = null;

function patchUser() {
    try {
        const user = UserStore?.getCurrentUser?.();
        if (user) {
            user.nsfwAllowed = true;
            user.ageVerificationStatus = 3;
            return true;
        }
    } catch { }
    return false;
}

const SPOILER_STRIP = ["opaque_", "hidden_", "constrainedObscureContent_"];
const IMAGE_STRIP = ["obscured_", "hiddenExplicit_", "hiddenMosaicItem_"];

function stripClasses(el: Element, prefixes: string[]) {
    for (const cls of [...el.classList]) {
        if (prefixes.some(p => cls.startsWith(p))) el.classList.remove(cls);
    }
}

function sweepDOM(root: Element | null) {
    if (!root) return;

    root.querySelectorAll<HTMLElement>(
        '[class*="explicitContentWarning"], [class*="obscureWarning"], [class*="sensitiveContent"], [class*="hideMedia"]'
    ).forEach(el => { el.style.display = "none"; });

    root.querySelectorAll('[class*="spoilerContent"]')
        .forEach(el => stripClasses(el, SPOILER_STRIP));

    root.querySelectorAll('[class*="obscured_"], [class*="hiddenExplicit_"], [class*="hiddenMosaicItem_"]')
        .forEach(el => stripClasses(el, IMAGE_STRIP));

    root.querySelectorAll<HTMLElement>('a[href*="safety"], [class*="hiddenReason"]')
        .forEach(el => {
            if (el.textContent?.includes("hide some media") || el.textContent?.includes("Why we hide")) {
                const container = el.closest("div");
                if (container) container.style.display = "none";
            }
        });

    root.querySelectorAll("button").forEach(btn => {
        const text = btn.textContent?.trim();
        if (text === "Continue" || text === "I understand") {
            const gate = btn.closest('[class*="channelNotice"], [class*="nsfwGate"], [class*="ageGate"], [class*="ageConfirmation"]');
            if (gate) setTimeout(() => btn.click(), 100);
        }
    });
}

let observer: MutationObserver | null = null;
let sweepInterval: ReturnType<typeof setInterval> | null = null;

export default definePlugin({
    name: "NSFWUnblocker",
    description: "Bypasses Discord's ID verification requirement and explicit content filters",
    authors: [Devs.DonutsDelivery],

    patches: [
        {
            find: ",nsfwAllowed:",
            replacement: {
                match: /(\i)\.nsfwAllowed=/,
                replace: "$1.nsfwAllowed=true;$1.nsfwAllowed=",
            },
        },
    ],

    flux: {
        MESSAGE_CREATE: patchEvent,
        MESSAGE_UPDATE: patchEvent,
        LOAD_MESSAGES_SUCCESS: patchEvent,
        LOAD_MESSAGES_AROUND_SUCCESS: patchEvent,
        LOAD_PINNED_MESSAGES_SUCCESS: patchEvent,
        SEARCH_FINISH: patchEvent,
    },

    start() {
        patchXHR();

        patchUser();
        userPatchInterval = setInterval(patchUser, 3000);

        observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof Element) sweepDOM(node);
                    }
                } else if (mutation.type === "attributes" && mutation.target instanceof Element) {
                    const el = mutation.target as HTMLElement;
                    const cls = el.className;
                    if (typeof cls !== "string") continue;
                    if (cls.includes("explicitContentWarning") || cls.includes("obscureWarning") || cls.includes("sensitiveContent")) {
                        el.style.display = "none";
                    }
                    if (cls.includes("spoilerContent")) stripClasses(el, SPOILER_STRIP);
                    if (cls.includes("obscured_") || cls.includes("hiddenExplicit_") || cls.includes("hiddenMosaicItem_")) {
                        stripClasses(el, IMAGE_STRIP);
                    }
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
        });

        sweepDOM(document.body);
        sweepInterval = setInterval(() => sweepDOM(document.body), 2000);
    },

    stop() {
        unpatchXHR();
        if (userPatchInterval) {
            clearInterval(userPatchInterval);
            userPatchInterval = null;
        }
        observer?.disconnect();
        observer = null;
        if (sweepInterval) {
            clearInterval(sweepInterval);
            sweepInterval = null;
        }
    },
});
