/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export async function downloadVoice(_, url: string) {
    const resp = await fetch(url, {
        mode: "no-cors",
    });
    if (!resp.ok) return;

    const buff = await resp.arrayBuffer();
    return Buffer.from(buff);
}
