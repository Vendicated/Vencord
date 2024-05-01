/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import https from "https";

export function executeWebhook(_, url: string, body: object) {
    const { hostname, pathname } = new URL(url);

    if (!["discord.com", "ptb.discord.com", "canary.discord.com"].includes(hostname) || !pathname.startsWith("/api/webhooks/")) {
        throw new Error("This URL is not a valid webhook.");
    }

    const req = https.request(url, { method: "POST", headers: { "Content-Type": "application/json", } });
    req.write(JSON.stringify(body));
    req.end();
}
