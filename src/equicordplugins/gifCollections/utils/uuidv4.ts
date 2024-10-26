/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function uuidv4(prefix: string) {
    let d = new Date().getTime();
    d += performance.now();
    return `${prefix}xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, c => {
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        if (c === "x") {
            return r.toString(16);
        } else {
            return ((r & 0x3) | 0x8).toString(16);
        }
    });
}
