/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const VENCORD_FILES = [
    IS_DISCORD_DESKTOP ? "patcher.js" : "vencordDesktopMain.js",
    IS_DISCORD_DESKTOP ? "preload.js" : "vencordDesktopPreload.js",
    IS_DISCORD_DESKTOP ? "renderer.js" : "vencordDesktopRenderer.js",
    IS_DISCORD_DESKTOP ? "renderer.css" : "vencordDesktopRenderer.css",
];

export function serializeErrors(func: (...args: any[]) => any) {
    return async function () {
        try {
            return {
                ok: true,
                value: await func(...arguments)
            };
        } catch (e: any) {
            return {
                ok: false,
                error: e instanceof Error ? {
                    // prototypes get lost, so turn error into plain object
                    ...e
                } : e
            };
        }
    };
}
