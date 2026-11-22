/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 notjacobwashere and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function parseAvatarResource(name: string) {
    try {
        const url = new URL(name);
        if (url.protocol !== "https:" || !["cdn.discordapp.com", "media.discordapp.net"].includes(url.hostname)) return;
        const match = /^\/avatars\/(\d{17,20})\/((?:a_)?[a-f0-9]{32})\.(?:png|gif|webp|jpe?g)$/.exec(url.pathname);
        if (match) return { id: match[1], hash: match[2] };
    } catch { /* Ignore unrelated resources. */ }
}

export function watchAvatarResources(onAvatar: (id: string, hash: string) => void) {
    if (typeof PerformanceObserver === "undefined") return () => {};
    const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
            const avatar = parseAvatarResource(entry.name);
            if (avatar) onAvatar(avatar.id, avatar.hash);
        }
    });
    observer.observe({ type: "resource", buffered: false });
    return () => observer.disconnect();
}
