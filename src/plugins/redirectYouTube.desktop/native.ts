/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { patchCspDirective } from "main";
import { getSettings } from "main/ipcMain";

// For some reason I don't really understand getSettings returns an empty object if we call it too close to startup, so
// delay it slightly by waiting for a window to be created.
app.once("browser-window-created", () => {
    const settings = getSettings().plugins?.RedirectYouTube;
    if (settings?.enabled && settings.instances) {
        const instanceHosts = settings.instances.split(",").map(v => new URL(v.trim()).origin);
        patchCspDirective("frame-src", instanceHosts);
    }
});
