/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Options {
    paused: boolean;
    suppressEveryone: boolean;
    suppressPersonal: boolean;
    suppressDirectMessages: boolean;
    suppressReplies: boolean;
    suppressRoles: boolean;
}

export interface PreferenceDocument {
    version: 3;
    language: "ar" | "en";
    accounts: Record<string, Options>;
}

export type PreferenceResult = { ok: true; document: PreferenceDocument; } | { ok: false; error: string; };

export function defaultOptions(): Options {
    return { paused: false, suppressEveryone: false, suppressPersonal: false, suppressDirectMessages: false, suppressReplies: false, suppressRoles: false };
}

export function defaultDocument(): PreferenceDocument {
    return { version: 3, language: "en", accounts: {} };
}

const MAX_SNOWFLAKE = "18446744073709551615";
const legacyOptionKeys = ["paused", "suppressEveryone", "suppressPersonal", "suppressRoles"] as const;
const versionTwoOptionKeys = ["paused", "suppressEveryone", "suppressPersonal", "suppressReplies", "suppressRoles", "hideBadges", "autoRead"] as const;
const optionKeys = ["paused", "suppressEveryone", "suppressPersonal", "suppressDirectMessages", "suppressReplies", "suppressRoles"] as const;

export function isSnowflake(value: unknown): value is string {
    return typeof value === "string" && /^[1-9]\d{0,19}$/.test(value)
        && (value.length < MAX_SNOWFLAKE.length || value <= MAX_SNOWFLAKE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    const actual = Reflect.ownKeys(value);
    return actual.length === keys.length && actual.every(key => typeof key === "string" && keys.includes(key));
}

function isBooleanRecord(value: unknown, keys: readonly string[]): value is Record<string, boolean> {
    try {
        return isRecord(value) && exactKeys(value, keys) && keys.every(key => typeof value[key] === "boolean");
    } catch {
        return false;
    }
}

export function isOptions(value: unknown): value is Options {
    return isBooleanRecord(value, optionKeys);
}

export function readDocument(value: unknown): PreferenceResult {
    try {
        if (!isRecord(value) || !exactKeys(value, ["version", "language", "accounts"]) || (value.version !== 1 && value.version !== 2 && value.version !== 3))
            return { ok: false, error: "Unsupported MentionControl preferences schema; original behavior retained." };
        if ((value.language !== "ar" && value.language !== "en") || !isRecord(value.accounts))
            return { ok: false, error: "Invalid MentionControl language or accounts; original behavior retained." };
        const accounts: Record<string, Options> = {};
        for (const accountId of Reflect.ownKeys(value.accounts)) {
            if (!isSnowflake(accountId))
                return { ok: false, error: "Invalid saved account identifier; original behavior retained." };
            const options = value.accounts[accountId];
            if (value.version === 1) {
                if (!isBooleanRecord(options, legacyOptionKeys))
                    return { ok: false, error: "Invalid legacy account options; original behavior retained." };
                // The old personal option covered both tags and reply pings; preserve that consent span.
                accounts[accountId] = {
                    paused: options.paused, suppressEveryone: options.suppressEveryone,
                    suppressPersonal: options.suppressPersonal, suppressDirectMessages: false, suppressReplies: options.suppressPersonal,
                    suppressRoles: options.suppressRoles
                };
            } else if (value.version === 2) {
                if (!isBooleanRecord(options, versionTwoOptionKeys))
                    return { ok: false, error: "Invalid version 2 account options; original behavior retained." };
                accounts[accountId] = {
                    paused: options.paused, suppressEveryone: options.suppressEveryone,
                    suppressPersonal: options.suppressPersonal, suppressDirectMessages: false,
                    suppressReplies: options.suppressReplies, suppressRoles: options.suppressRoles
                };
            } else {
                if (!isOptions(options))
                    return { ok: false, error: "Invalid saved account options; original behavior retained." };
                accounts[accountId] = { ...options };
            }
        }
        return { ok: true, document: { version: 3, language: value.language, accounts } };
    } catch {
        return { ok: false, error: "Could not read MentionControl preferences; original behavior retained." };
    }
}

export function setAccountOptions(document: PreferenceDocument, accountId: string, options: Options): PreferenceDocument {
    if (!isSnowflake(accountId)) throw new Error("Invalid account identifier.");
    if (!isOptions(options)) throw new Error("Invalid account options.");
    const current = readDocument(document);
    if (!current.ok) throw new Error(current.error);
    return { ...current.document, accounts: { ...current.document.accounts, [accountId]: { ...options } } };
}

export function getAccountOptions(document: PreferenceDocument, accountId: unknown): Options {
    if (!isSnowflake(accountId)) return defaultOptions();
    const options = document.accounts[accountId];
    return isOptions(options) ? { ...options } : defaultOptions();
}
