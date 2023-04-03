/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { app, autoUpdater } from "electron";
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, writeFileSync } from "fs";
import { basename, dirname, join } from "path";

const { setAppUserModelId } = app;

// Apparently requiring Discords updater too early leads into issues,
// copied this workaround from powerCord
app.setAppUserModelId = function (id: string) {
    app.setAppUserModelId = setAppUserModelId;

    setAppUserModelId.call(this, id);

    patchUpdater();
};

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

// Windows Host Updates install to a new folder app-{HOST_VERSION}, so we
// need to reinject
function patchUpdater() {
    try {
        const autoStartScript = join(require.main!.filename, "..", "autoStart", "win32.js");
        const { update } = require(autoStartScript);

        require.cache[autoStartScript]!.exports.update = function () {
            update.apply(this, arguments);
            patchLatest();
        };
    } catch {
        // OpenAsar uses electrons autoUpdater on Windows
        const { quitAndInstall } = autoUpdater;
        autoUpdater.quitAndInstall = function () {
            patchLatest();
            quitAndInstall.call(this);
        };
    }
}
