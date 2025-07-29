/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const cleanUrl = async (url: string) => {
    const urlObject = new URL(url);
    urlObject.search = "";

    try {
        const res = await fetch(urlObject.href, { method: "HEAD" });
        if (res.status === 404) {
            const proxyUrl = `https://cdnproxy.thororen.com/?${urlObject.href}`;
            const proxyRes = await fetch(proxyUrl, { method: "HEAD" });
            if (!proxyRes.ok) throw new Error(`URL not found: ${proxyUrl}`);
            urlObject.href = proxyUrl;
        }
    } catch (err) {
        console.error(err);
    }

    return urlObject.href;
};

