/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";
import https from "https";

const DiscordHosts = new Set(["discord.com", "ptb.discord.com", "canary.discord.com"]);

export function executeWebhook(_event: IpcMainInvokeEvent, url: string, body: object) {
    const { hostname, pathname } = new URL(url);

    if (!DiscordHosts.has(hostname) || !pathname.startsWith("/api/webhooks/")) {
        throw new Error("This URL is not a valid webhook.");
    }

    const req = https.request(url, { method: "POST", headers: { "Content-Type": "application/json", } });
    req.write(JSON.stringify(body));
    req.end();
}
