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
import { dirname, basename, join } from "path";
import { readdirSync, existsSync, mkdirSync, writeFileSync } from "fs";

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
    const currentAppPath = dirname(process.execPath);
    const currentVersion = basename(currentAppPath);
    const discordPath = join(currentAppPath, "..");

    const latestVersion = readdirSync(discordPath).reduce((prev, curr) => {
        return (curr.startsWith("app-") && isNewer(curr, prev))
            ? curr
            : prev;
    }, currentVersion as string);

    if (latestVersion === currentVersion) return;

    const app = join(discordPath, latestVersion, "resources", "app");
    if (existsSync(app)) return;

    console.info("[Vencord] Detected Host Update. Repatching...");

    const patcherPath = join(__dirname, "patcher.js");
    mkdirSync(app);
    writeFileSync(join(app, "package.json"), JSON.stringify({
        name: "discord",
        main: "index.js"
    }));
    writeFileSync(join(app, "index.js"), `require(${JSON.stringify(patcherPath)});`);
}

// Windows Host Updates install to a new folder app-{HOST_VERSION}, so we
// need to reinject
function patchUpdater() {
    const main = require.main!;
    const buildInfo = require(join(process.resourcesPath, "build_info.json"));

    try {
        if (buildInfo?.newUpdater) {
            const autoStartScript = join(main.filename, "..", "autoStart", "win32.js");
            const { update } = require(autoStartScript);

            // New Updater Injection
            require.cache[autoStartScript]!.exports.update = function () {
                patchLatest();
                update.apply(this, arguments);
            };
        } else {
            const hostUpdaterScript = join(main.filename, "..", "hostUpdater.js");
            const { quitAndInstall } = require(hostUpdaterScript);

            // Old Updater Injection
            require.cache[hostUpdaterScript]!.exports.quitAndInstall = function () {
                patchLatest();
                quitAndInstall.apply(this, arguments);
            };
        }
    } catch {
        // OpenAsar uses electrons autoUpdater on Windows
        const { quitAndInstall } = autoUpdater;
        autoUpdater.quitAndInstall = function () {
            patchLatest();
            quitAndInstall.call(this);
        };
    }
}
