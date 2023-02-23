/*!
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

export * as Api from "./api";
export * as Plugins from "./plugins";
export * as Util from "./utils";
export * as QuickCss from "./utils/quickCss";
export * as Updater from "./utils/updater";
export * as Webpack from "./webpack";
export { PlainSettings, Settings };

import "./utils/quickCss";
import "./webpack/patchWebpack";

import { popNotice, showNotice } from "./api/Notices";
import { PlainSettings, Settings } from "./api/settings";
import { patches, PMLogger, startAllPlugins } from "./plugins";
import { getCloudSettings, shouldCloudSync } from "./utils/settingsSync";
import { checkForUpdates, rebuild, update, UpdateLogger } from "./utils/updater";
import { onceReady } from "./webpack";
import { SettingsRouter } from "./webpack/common";

export let Components: any;

async function syncSettings() {
    if (Settings.backend.settingsSync && await shouldCloudSync()) {
        await getCloudSettings(false);

        showNotice(
            "Vencord settings have been updated from the cloud!",
            "Restart",
            () => {
                location.reload();
            }
        );
    }
}

async function init() {
    await onceReady;
    startAllPlugins();
    Components = await import("./components");

    await syncSettings();

    if (!IS_WEB) {
        try {
            const isOutdated = await checkForUpdates();
            if (!isOutdated) return;

            if (Settings.autoUpdate) {
                await update();
                const needsFullRestart = await rebuild();
                setTimeout(() => {
                    showNotice(
                        "Vencord has been updated!",
                        "Restart",
                        () => {
                            if (needsFullRestart)
                                window.DiscordNative.app.relaunch();
                            else
                                location.reload();
                        }
                    );
                }, 10_000);
                return;
            }

            if (Settings.notifyAboutUpdates)
                setTimeout(() => {
                    showNotice(
                        "A Vencord update is available!",
                        "View Update",
                        () => {
                            popNotice();
                            SettingsRouter.open("VencordUpdater");
                        }
                    );
                }, 10_000);
        } catch (err) {
            UpdateLogger.error("Failed to check for updates", err);
        }
    }

    if (IS_DEV) {
        const pendingPatches = patches.filter(p => !p.all && p.predicate?.() !== false);
        if (pendingPatches.length)
            PMLogger.warn(
                "Webpack has finished initialising, but some patches haven't been applied yet.",
                "This might be expected since some Modules are lazy loaded, but please verify",
                "that all plugins are working as intended.",
                "You are seeing this warning because this is a Development build of Vencord.",
                "\nThe following patches have not been applied:",
                "\n\n" + pendingPatches.map(p => `${p.plugin}: ${p.find}`).join("\n")
            );
    }
}

init();
