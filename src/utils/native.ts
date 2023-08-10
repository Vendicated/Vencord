/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function relaunch() {
    if (IS_DISCORD_DESKTOP)
        window.DiscordNative.app.relaunch();
    else
        window.VencordDesktopNative.app.relaunch();
}

export function showItemInFolder(path: string) {
    if (IS_DISCORD_DESKTOP)
        window.DiscordNative.fileManager.showItemInFolder(path);
    else
        window.VencordDesktopNative.fileManager.showItemInFolder(path);
}
