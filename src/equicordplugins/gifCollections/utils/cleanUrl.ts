/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const cleanUrl = (url: string) => {
    const urlObject = new URL(url);
    urlObject.search = "";
    return urlObject.href;
};
