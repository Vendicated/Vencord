/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RestAPI } from "@webpack/common";

import { logger } from "./misc";

export function isCdnUrlExpired(url: string): boolean {
    try {
        const ex = new URL(url).searchParams.get("ex");
        if (!ex) return false;
        return parseInt(ex, 16) * 1000 < Date.now();
    } catch (e) {
        logger.warn("Failed to parse CDN URL expiry", e);
        return false;
    }
}

export async function batchRefreshAttachmentUrls(urls: string[]): Promise<Record<string, string>> {
    try {
        const response = await RestAPI.post({
            url: "/attachments/refresh-urls",
            body: { attachment_urls: urls }
        });
        if (!response.ok) return {};
        const map: Record<string, string> = {};
        for (const { original, refreshed } of response.body.refreshed_urls) {
            map[original] = refreshed;
        }
        return map;
    } catch (e) {
        logger.warn("Failed to refresh attachment URLs", e);
        return {};
    }
}
