/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { i18n } from "@webpack/common";

import { getArabicByEnglish,getArabicByHash, getArabicByPlainKey, translateEnglishResult } from "./lookup";

const logger = new Logger("ArabicUI");

type IntlFn = (...args: any[]) => any;

let originalString: IntlFn | null = null;
let originalFormat: IntlFn | null = null;
let originalT: any = null;
let hooked = false;

export function dumpUntranslatedMessages(): Record<string, string> {
    const untranslated: Record<string, string> = {};
    const messages = (i18n as any)?.Messages;
    if (!messages) return untranslated;

    for (const key of Object.keys(messages)) {
        if (getArabicByPlainKey(key) != null) continue;

        try {
            const rawVal = messages[key];
            let english = "";
            if (typeof rawVal === "string") {
                english = rawVal;
            } else if (rawVal && typeof rawVal === "object") {
                if (originalString) {
                    english = originalString(rawVal);
                } else {
                    english = (rawVal as any).defaultMessage || (rawVal as any).message || "";
                }
            } else if (typeof rawVal === "function") {
                english = rawVal();
            }

            if (english && typeof english === "string" && /[A-Za-z]/.test(english)) {
                untranslated[key] = english;
            }
        } catch (e) {
            // ignore
        }
    }

    return untranslated;
}

function messageId(message: unknown): string | undefined {
    if (message == null) return;
    if (typeof message === "string") return message;
    if (typeof message === "object") {
        const m = message as Record<string, unknown>;
        if (typeof m.id === "string") return m.id;
        if (typeof m.key === "string") return m.key;
    }
}

function fillTemplate(template: string, values?: Record<string, any>): string | null {
    if (!values || !Object.keys(values).length) return template;

    let ok = true;
    const out = template.replace(/\{(\w+)\}/g, (_, key: string) => {
        const v = values[key];
        if (v == null) return `{${key}}`;
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
            return String(v);
        ok = false;
        return "";
    });

    return ok ? out : null;
}

function wrapCallable(fn: Function) {
    return function (this: any, ...args: any[]) {
        const result = fn.apply(this, args);
        return translateEnglishResult(result);
    };
}

export function installDiscordHook() {
    if (hooked) return;

    const intl = i18n?.intl;
    if (!intl || typeof intl.string !== "function" || typeof intl.format !== "function") {
        logger.warn("i18n.intl not ready; Arabic Discord strings disabled this session");
        return;
    }

    originalString = intl.string.bind(intl);
    originalFormat = intl.format.bind(intl);

    intl.string = (message: unknown) => {
        const id = messageId(message);
        const byHash = id ? getArabicByHash(id) : undefined;
        if (byHash != null) return byHash;

        if (message && typeof message === "object") {
            const m = message as Record<string, any>;
            const defaultMsg = m.defaultMessage || m.message;
            if (typeof defaultMsg === "string") {
                const arabic = getArabicByEnglish(defaultMsg);
                if (arabic != null) {
                    const cloned = { ...m };
                    if (cloned.defaultMessage) cloned.defaultMessage = arabic;
                    if (cloned.message) cloned.message = arabic;
                    return originalString!(cloned);
                }
            }
        }

        return translateEnglishResult(originalString!(message));
    };

    intl.format = (message: unknown, values?: Record<string, any>) => {
        const id = messageId(message);
        const byHash = id ? getArabicByHash(id) : undefined;
        if (byHash != null) {
            const filled = fillTemplate(byHash, values);
            if (filled != null) return filled;

            if (message && typeof message === "object") {
                const m = message as Record<string, any>;
                const cloned = { ...m };
                if (cloned.defaultMessage) cloned.defaultMessage = byHash;
                if (cloned.message) cloned.message = byHash;
                return translateEnglishResult(originalFormat!(cloned, values));
            }
        }

        let defaultMsg: string | undefined;
        if (message && typeof message === "object") {
            const m = message as Record<string, any>;
            if (typeof m.defaultMessage === "string") defaultMsg = m.defaultMessage;
            else if (typeof m.message === "string") defaultMsg = m.message;
        }
        // Resolve English when Discord only passes a hashed message descriptor
        if (!defaultMsg && originalString) {
            try {
                const resolved = originalString(message);
                if (typeof resolved === "string") defaultMsg = resolved;
            } catch { /* ignore */ }
        }

        if (typeof defaultMsg === "string") {
            const arabic = getArabicByEnglish(defaultMsg);
            if (arabic != null) {
                if (message && typeof message === "object") {
                    const m = message as Record<string, any>;
                    const cloned = { ...m };
                    if (cloned.defaultMessage) cloned.defaultMessage = arabic;
                    else if (cloned.message) cloned.message = arabic;
                    else cloned.defaultMessage = arabic;
                    return translateEnglishResult(originalFormat!(cloned, values));
                }
                // Plain string message id path — still try format then translate leaves
                return translateEnglishResult(originalFormat!(message, values));
            }
        }

        return translateEnglishResult(originalFormat!(message, values));
    };

    if (i18n.t && originalT == null) {
        originalT = i18n.t;
        i18n.t = new Proxy(originalT, {
            get(target, prop, receiver) {
                const val = Reflect.get(target, prop, receiver);
                if (typeof val === "function")
                    return wrapCallable(val);
                return val;
            },
        });
    }

    if (typeof window !== "undefined") {
        (window as any).getUntranslatedDiscordMessages = () => {
            return dumpUntranslatedMessages();
        };
    }

    hooked = true;
    logger.info("Discord intl hook installed");
}

export function uninstallDiscordHook() {
    if (!hooked || !i18n?.intl) return;

    if (originalString) i18n.intl.string = originalString;
    if (originalFormat) i18n.intl.format = originalFormat;
    if (originalT) i18n.t = originalT;

    if (typeof window !== "undefined") {
        delete (window as any).getUntranslatedDiscordMessages;
    }

    originalString = null;
    originalFormat = null;
    originalT = null;
    hooked = false;
    logger.info("Discord intl hook removed");
}
