/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, writeFileSync } from "original-fs";
import { basename, dirname, join } from "path";

function isNewer($new: string, old: string) {
    const newParts = $new.slice(4).split(".").map(Number);
    const oldParts = old.slice(4).split(".").map(Number);

    for (let i = 0; i < oldParts.length; i++) {
        if (newParts[i] > oldParts[i]) return true;
        if (newParts[i] < oldParts[i]) return false;
    }
    return false;
}

function patchLatest() {
    if (process.env.DISABLE_UPDATER_AUTO_PATCHING) return;

    try {
        const currentAppPath = dirname(process.execPath);
        const currentVersion = basename(currentAppPath);
        const discordPath = join(currentAppPath, "..");

        const latestVersion = readdirSync(discordPath).reduce((prev, curr) => {
            return (curr.startsWith("app-") && isNewer(curr, prev))
                ? curr
                : prev;
        }, currentVersion as string);

        if (latestVersion === currentVersion) return;

        const resources = join(discordPath, latestVersion, "resources");
        const app = join(resources, "app.asar");
        const _app = join(resources, "_app.asar");

        if (!existsSync(app) || statSync(app).isDirectory()) return;

        console.info("[Vencord] Detected Host Update. Repatching...");

        renameSync(app, _app);
        mkdirSync(app);
        writeFileSync(join(app, "package.json"), JSON.stringify({
            name: "discord",
            main: "index.js"
        }));
        writeFileSync(join(app, "index.js"), `require(${JSON.stringify(join(__dirname, "patcher.js"))});`);
    } catch (err) {
        console.error("[Vencord] Failed to repatch latest host update", err);
    }
}

// Try to patch latest on before-quit
// Discord's Win32 updater will call app.quit() on restart and open new version on will-quit
app.on("before-quit", patchLatest);
