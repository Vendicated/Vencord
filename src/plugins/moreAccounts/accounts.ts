/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { find, findByPropsLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher, RestAPI, UserStore } from "@webpack/common";

const logger = new Logger("MoreAccounts");

const Tokens = findByPropsLazy("getToken", "setToken", "encryptAndStoreTokens");
const MultiAccountStore = findStoreLazy("MultiAccountStore");

function isKv(o: any) {
    return o != null && typeof o.get === "function" && typeof o.set === "function" && typeof o.remove === "function";
}

function hasTokens(o: any) {
    try {
        const t = o.get("tokens");
        return t != null && typeof t === "object" && Object.keys(t).some(k => /^\d+$/.test(k));
    } catch {
        return false;
    }
}

let cache: any = null;
function storage() {
    if (isKv(cache)) return cache;
    const mod: any = find((m: any) => {
        if (!m || typeof m !== "object") return false;
        try {
            return Object.values(m).some((v: any) => isKv(v) && hasTokens(v));
        } catch {
            return false;
        }
    });
    cache = mod ? Object.values(mod).find((v: any) => isKv(v) && hasTokens(v)) ?? null : null;
    return cache;
}

export function storageReady() {
    return isKv(storage());
}

function storedIds(): string[] {
    try {
        return Object.keys(storage()?.get?.("tokens") ?? {}).filter(k => /^\d+$/.test(k));
    } catch {
        return [];
    }
}

export function countHidden() {
    const store: any = MultiAccountStore;
    const inSwitcher = new Set((store.getUsers?.() ?? []).map((u: any) => u.id));
    return storedIds().filter(id => !inSwitcher.has(id)).length;
}

async function check(token: string) {
    try {
        const res: any = await (RestAPI as any).get({ url: "/users/@me", headers: { authorization: token } });
        return { valid: true, user: res.body };
    } catch {
        return { valid: false };
    }
}

export interface RestoreResult {
    added: number;
    valid: number;
    expired: number;
    skippedNoToken: number;
    skippedLimit: number;
}

export async function restoreHiddenAccounts(maxAccounts: number): Promise<RestoreResult> {
    const r: RestoreResult = { added: 0, valid: 0, expired: 0, skippedNoToken: 0, skippedLimit: 0 };

    const store: any = MultiAccountStore;
    const users: any[] = store?.getUsers?.();
    if (!users || !storage() || !Tokens) return r;

    const max = Number.isFinite(maxAccounts) && maxAccounts >= 5 ? Math.floor(maxAccounts) : 50;
    const present = new Set(users.map(u => u.id));
    const hidden = storedIds().filter(id => !present.has(id));

    const toRestore = hidden.slice(0, Math.max(0, max - users.length));
    r.skippedLimit = hidden.length - toRestore.length;

    const done: { id: string; valid: boolean; }[] = [];

    for (const id of toRestore) {
        try {
            const tok = (Tokens as any).getToken(id);
            if (!tok) {
                r.skippedNoToken++;
                continue;
            }

            const out: any = await check(tok);
            const profile = out.user ?? (UserStore as any).getUser?.(id);

            users.push({
                id,
                username: profile?.username ?? `Account ${id}`,
                avatar: profile?.avatar ?? null,
                discriminator: profile?.discriminator ?? "0",
                tokenStatus: out.valid ? 2 : 0,
                pushSyncToken: null
            });

            done.push({ id, valid: out.valid });
            r.added++;
            if (out.valid) r.valid++;
            else r.expired++;
        } catch (e) {
            logger.error(`failed to restore ${id}`, e);
            r.skippedNoToken++;
        }
    }

    for (const { id, valid } of done) {
        FluxDispatcher.dispatch({
            type: valid ? "MULTI_ACCOUNT_VALIDATE_TOKEN_SUCCESS" : "MULTI_ACCOUNT_VALIDATE_TOKEN_FAILURE",
            userId: id
        });
    }

    return r;
}
