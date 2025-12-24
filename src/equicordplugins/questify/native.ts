/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

export async function complete(_: IpcMainInvokeEvent, appID: string, authCode: string, questTarget: number): Promise<{ success: boolean; error: string | null; }> {
    const result = await authorize(appID, authCode);

    if (result.error || !result.token) {
        return { success: false, error: JSON.stringify(result.error) };
    }

    const success = await progress(appID, result.token, questTarget);

    if (success.error || !success.success) {
        return { success: false, error: JSON.stringify(success.error) };
    }

    return { success: true, error: null };
}

async function authorize(appID: string, authCode: string): Promise<{ token: string | false; error: any; }> {
    let error = null;

    const token = await fetch(`https://${appID}.discordsays.com/.proxy/acf/authorize`, {
        body: JSON.stringify({ code: authCode }),
        method: "POST",
        mode: "cors",
        credentials: "include"
    }).then(res => res.json()).then(data => data.token).catch(e => { error = e; return ""; });

    return { token, error };
}

async function progress(appID: string, token: string, questTarget: number): Promise<{ success: boolean; error: any; }> {
    let error = null;

    const success = await fetch(`https://${appID}.discordsays.com/.proxy/acf/quest/progress`, {
        headers: { "x-auth-token": token },
        body: JSON.stringify({ progress: questTarget }),
        method: "POST",
        mode: "cors",
        credentials: "include"
    }).then(res => res.ok).catch(e => { error = e; return false; });

    return { success, error };
}
