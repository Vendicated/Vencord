/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function getUrlExtension(url: string) {
    if (!url.startsWith("https:")) url = "https:" + url;
    return new URL(url).pathname.split(".").pop();
}
