/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow, type IpcMainInvokeEvent } from "electron";

const allowedOrigins = new Set(["https://discord.com", "https://canary.discord.com", "https://ptb.discord.com"]);
const requestTimeoutMs = 30_000;

export function canOpenDevTools(event: IpcMainInvokeEvent): boolean {
    return !event.sender.isDestroyed();
}

export function openDevTools(event: IpcMainInvokeEvent): boolean {
    if (!canOpenDevTools(event)) {
        return false;
    }

    const window = BrowserWindow.fromWebContents(event.sender);

    if (event.sender.isDevToolsOpened()) {
        window?.focus();

        return true;
    }

    event.sender.openDevTools();

    return true;
}

export async function complete(event: IpcMainInvokeEvent, appId: string, authCode: string, questTarget: number, questId: string, proxyTicket?: string): Promise<{ success: boolean; error: string | null; }> {
    if (!isTrustedSender(event)) {
        return { success: false, error: "Untrusted request sender." };
    }

    if (!isSnowflake(appId) || !isSnowflake(questId) || !isAuthCode(authCode) || !isQuestTarget(questTarget) || !isProxyTicket(proxyTicket)) {
        return { success: false, error: "Invalid completion arguments." };
    }

    const origin = new URL(`https://${appId}.discordsays.com/`);
    const activityReferrer = getActivityReferrer(origin, proxyTicket);
    const signal = AbortSignal.timeout(requestTimeoutMs);
    const authorization = await authorize(origin, authCode, questId, activityReferrer, signal);

    if (!authorization.token) {
        return { success: false, error: "AUTH: " + authorization.error };
    }

    if (!isTrustedSender(event)) {
        return { success: false, error: "Request sender is no longer available." };
    }

    const progressResult = await progress(origin, authorization.token, questTarget, questId, activityReferrer, signal);

    if (!progressResult.success) {
        return { success: false, error: "PROGRESS: " + progressResult.error };
    }

    return { success: true, error: null };
}

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
    if (event.sender.isDestroyed()) {
        return false;
    }

    const frame = event.senderFrame;

    return frame != null && frame === event.sender.mainFrame && allowedOrigins.has(frame.origin);
}

function isSnowflake(value: unknown): value is string {
    return typeof value === "string" && /^[1-9]\d{0,19}$/.test(value) && BigInt(value) <= 0xffffffffffffffffn;
}

function isAuthCode(value: unknown): value is string {
    return typeof value === "string" && /^[A-Za-z0-9]+$/.test(value);
}

function isAuthToken(value: unknown): value is string {
    return typeof value === "string" && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function isQuestTarget(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
}

function isProxyTicket(value: unknown): value is string | undefined {
    return value === undefined || (typeof value === "string" && /^[A-Za-z0-9+/]+={0,2}\.[A-Za-z0-9+/]+={0,2}$/.test(value));
}

function getActivityReferrer(origin: URL, proxyTicket?: string): string | undefined {
    if (!proxyTicket) {
        return undefined;
    }

    const referrer = new URL(origin);
    referrer.searchParams.set("instance_id", "example-cl-instance");
    referrer.searchParams.set("platform", "desktop");
    referrer.searchParams.set("discord_proxy_ticket", proxyTicket);

    return referrer.toString();
}

function getActivityHeaders(questId: string, authToken: string = "", activityReferrer?: string): Record<string, string> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Auth-Token": authToken,
        "X-Discord-Quest-ID": questId,
    };

    if (activityReferrer) {
        headers.Referer = activityReferrer;
    }

    return headers;
}

async function authorize(origin: URL, authCode: string, questId: string, activityReferrer: string | undefined, signal: AbortSignal): Promise<{ token: string | null; error: string | null; }> {
    try {
        const options: RequestInit = {
            headers: getActivityHeaders(questId, "", activityReferrer),
            body: JSON.stringify({ code: authCode }),
            method: "POST",
            redirect: "error",
            signal,
        };

        const response = await fetch(new URL("/.proxy/acf/authorize", origin), options);

        if (!response.ok) {
            await response.body?.cancel();
            return { token: null, error: `HTTP ${response.status}.` };
        }

        const data: unknown = await response.json();

        if (data == null || typeof data !== "object" || !("token" in data) || !isAuthToken(data.token)) {
            return { token: null, error: "Invalid authorization response." };
        }

        return { token: data.token, error: null };
    } catch {
        return { token: null, error: "Request failed or timed out." };
    }
}

async function progress(origin: URL, authToken: string, questTarget: number, questId: string, activityReferrer: string | undefined, signal: AbortSignal): Promise<{ success: boolean; error: string | null; }> {
    try {
        const options: RequestInit = {
            headers: getActivityHeaders(questId, authToken, activityReferrer),
            body: JSON.stringify({ progress: questTarget }),
            method: "POST",
            redirect: "error",
            signal,
        };

        const response = await fetch(new URL("/.proxy/acf/quest/progress", origin), options);

        await response.body?.cancel();

        return response.ok
            ? { success: true, error: null }
            : { success: false, error: `HTTP ${response.status}.` };
    } catch {
        return { success: false, error: "Request failed or timed out." };
    }
}
