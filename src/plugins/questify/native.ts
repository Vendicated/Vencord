/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow, type IpcMainInvokeEvent } from "electron";

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

export async function complete(_: IpcMainInvokeEvent, appId: string, authCode: string, questTarget: number): Promise<{ success: boolean; error: string | null; }> {
    const authorization = await authorize(appId, authCode);

    if (authorization.error || !authorization.token) {
        return { success: false, error: JSON.stringify(authorization.error) };
    }

    const progressResult = await progress(appId, authorization.token, questTarget);

    if (progressResult.error || !progressResult.success) {
        return { success: false, error: JSON.stringify(progressResult.error) };
    }

    return { success: true, error: null };
}

async function authorize(appId: string, authCode: string): Promise<{ token: string | false; error: unknown; }> {
    let error: unknown = null;

    const token = await fetch(`https://${appId}.discordsays.com/.proxy/acf/authorize`, {
        body: JSON.stringify({ code: authCode }),
        method: "POST",
        mode: "cors",
        credentials: "include",
    })
        .then(res => res.json())
        .then(data => data.token)
        .catch(e => {
            error = e;
            return false;
        });

    return { token, error };
}

async function progress(appId: string, token: string, questTarget: number): Promise<{ success: boolean; error: unknown; }> {
    let error: unknown = null;

    const success = await fetch(`https://${appId}.discordsays.com/.proxy/acf/quest/progress`, {
        headers: { "x-auth-token": token },
        body: JSON.stringify({ progress: questTarget }),
        method: "POST",
        mode: "cors",
        credentials: "include",
    })
        .then(res => res.ok)
        .catch(e => {
            error = e;
            return false;
        });

    return { success, error };
}
