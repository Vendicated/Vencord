/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function relaunch() {
    if (IS_DISCORD_DESKTOP)
        window.DiscordNative.app.relaunch();
    else if (IS_VESKTOP)
        window.VesktopNative.app.relaunch();
    else
        location.reload();
}
