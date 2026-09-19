/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ConnectSrc, CspPolicies, ImageScriptsAndCssSrc } from "@main/csp";

CspPolicies["cdn.jsdelivr.net"] = ImageScriptsAndCssSrc;
CspPolicies["tessdata.projectnaptha.com"] = ConnectSrc;
CspPolicies["unpkg.com"] = ImageScriptsAndCssSrc;
CspPolicies["*.tenor.com"] = ImageScriptsAndCssSrc;
CspPolicies["*.tenor.co"] = ImageScriptsAndCssSrc;
CspPolicies["images-ext-1.discordapp.net"] = ImageScriptsAndCssSrc;
CspPolicies["images-ext-2.discordapp.net"] = ImageScriptsAndCssSrc;
CspPolicies["*.giphy.com"] = ImageScriptsAndCssSrc;

export async function fetchMediaBase64(url: string): Promise<string | null> {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        if (!res.ok) return null;
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/gif";
        return `data:${contentType};base64,${Buffer.from(buffer).toString("base64")}`;
    } catch {
        return null;
    }
}
