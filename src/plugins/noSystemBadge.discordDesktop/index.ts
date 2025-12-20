/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoSystemBadge",
    description: "Disables the taskbar and system tray unread count badge.",
    authors: [Devs.rushii],
    patches: [
        {
            find: ",setSystemTrayApplications",
            replacement: [
                {
                    match: /setBadge\(\i\).+?},/,
                    replace: "setBadge(){},"
                },
                {
                    match: /setSystemTrayIcon\(\i\).+?},/,
                    replace: "setSystemTrayIcon(){},"
                }
            ]
        }
    ]
});
