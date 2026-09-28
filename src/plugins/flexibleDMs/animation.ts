/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const opening = new Set<string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Mark an explicitly opened folder so only its newly mounted children animate. */
export function markFolderOpening(id: string) {
    opening.add(id);
    clearTimeout(timers.get(id));
    timers.set(id, setTimeout(() => {
        opening.delete(id);
        timers.delete(id);
    }, 200));
}

export const isFolderOpening = (id: string | undefined) => !!id && opening.has(id);
