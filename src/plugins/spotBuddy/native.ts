/*
 * Vencord, a Discord client mod
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ConnectSrc, CspPolicies } from "@main/csp";
import { IpcMainInvokeEvent } from "electron";

CspPolicies["lrclib.net"] = ConnectSrc;

export async function fetchText(_: IpcMainInvokeEvent, url: string) {
    if (!url.startsWith("https://lrclib.net/"))
        return { ok: false, status: 0, text: "" };

    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "Vencord-SpotBuddy" },
        });
        return { ok: res.ok, status: res.status, text: await res.text() };
    } catch (e) {
        return { ok: false, status: -1, text: String(e) };
    }
}
