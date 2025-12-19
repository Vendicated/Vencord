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

// DO NOT REMOVE UNLESS YOU WISH TO FACE THE WRATH OF THE CIRCULAR DEPENDENCY DEMON!!!!!!!
import "~plugins";

export * as Api from "./api";
export * as Plugins from "./api/PluginManager";
export * as Components from "./components";
export * as Util from "./utils";
export * as Updater from "./utils/updater";
export * as Webpack from "./webpack";
export * as WebpackPatcher from "./webpack/patchWebpack";
export { PlainSettings, Settings };

import { addVencordUiStyles } from "@components/css";
import { openSettingsTabModal, UpdaterTab } from "@components/settings";
import { debounce } from "@shared/debounce";
import { IS_WINDOWS } from "@utils/constants";
import { createAndAppendStyle } from "@utils/css";
import { StartAt } from "@utils/types";

import { get as dsGet } from "./api/DataStore";
import { NotificationData, showNotification } from "./api/Notifications";
import { initPluginManager, PMLogger, startAllPlugins } from "./api/PluginManager";
import { PlainSettings, Settings, SettingsStore } from "./api/Settings";
import { getCloudSettings, putCloudSettings, shouldCloudSync } from "./api/SettingsSync/cloudSync";
import { localStorage } from "./utils/localStorage";
import { relaunch } from "./utils/native";
import { checkForUpdates, update, UpdateLogger } from "./utils/updater";
import { onceReady } from "./webpack";
import { SettingsRouter } from "./webpack/common";
import { patches } from "./webpack/patchWebpack";

if (IS_REPORTER) {
    require("./debug/runReporter");
}

async function syncSettings() {
    if (localStorage.Vencord_cloudSyncDirection === undefined) {
        // by default, sync bi-directionally
        localStorage.Vencord_cloudSyncDirection = "both";
    }

    // pre-check for local shared settings
    if (
        Settings.cloud.authenticated &&
        !await dsGet("Vencord_cloudSecret") // this has been enabled due to local settings share or some other bug
    ) {
        // show a notification letting them know and tell them how to fix it
        showNotification({
            title: "Cloud Integrations",
            body: "We've noticed you have cloud integrations enabled in another client! Due to limitations, you will " +
                "need to re-authenticate to continue using them. Click here to go to the settings page to do so!",
            color: "var(--yellow-360)",
            onClick: () => SettingsRouter.open("VencordCloud")
        });
        return;
    }

    if (
        Settings.cloud.settingsSync && // if it's enabled
        Settings.cloud.authenticated && // if cloud integrations are enabled
        localStorage.Vencord_cloudSyncDirection !== "manual" // if we're not in manual mode
    ) {
        if (localStorage.Vencord_settingsDirty && shouldCloudSync("push")) {
            await putCloudSettings();
        } else if (shouldCloudSync("pull") && await getCloudSettings(false)) { // if we synchronized something (false means no sync)
            // we show a notification here instead of allowing getCloudSettings() to show one to declutter the amount of
            // potential notifications that might occur. getCloudSettings() will always send a notification regardless if
            // there was an error to notify the user, but besides that we only want to show one notification instead of all
            // of the possible ones it has (such as when your settings are newer).
            showNotification({
                title: "Cloud Settings",
                body: "Your settings have been updated! Click here to restart to fully apply changes!",
                color: "var(--green-360)",
                onClick: relaunch
            });
        }
    }

    const saveSettingsOnFrequentAction = debounce(async () => {
        if (Settings.cloud.settingsSync && Settings.cloud.authenticated && shouldCloudSync("push")) {
            await putCloudSettings();
        }
    }, 60_000);

    SettingsStore.addGlobalChangeListener(() => {
        localStorage.Vencord_settingsDirty = true;
        saveSettingsOnFrequentAction();
    });
}

let notifiedForUpdatesThisSession = false;

async function runUpdateCheck() {
    if (IS_UPDATER_DISABLED) return;

    const notify = (data: NotificationData) => {
        if (notifiedForUpdatesThisSession) return;
        notifiedForUpdatesThisSession = true;

        setTimeout(() => showNotification({
            permanent: true,
            noPersist: true,
            ...data
        }), 10_000);
    };

    try {
        const isOutdated = await checkForUpdates();
        if (!isOutdated) return;

        if (Settings.autoUpdate) {
            await update();
            if (Settings.autoUpdateNotification) {
                notify({
                    title: "Vencord has been updated!",
                    body: "Click here to restart",
                    onClick: relaunch
                });
            }
            return;
        }

        notify({
            title: "A Vencord update is available!",
            body: "Click here to view the update",
            onClick: () => openSettingsTabModal(UpdaterTab!)
        });
    } catch (err) {
        UpdateLogger.error("Failed to check for updates", err);
    }
}

async function init() {
    await onceReady;
    startAllPlugins(StartAt.WebpackReady);

    syncSettings();

    if (!IS_WEB && !IS_UPDATER_DISABLED) {
        runUpdateCheck();

        // this tends to get really annoying, so only do this if the user has auto-update without notification enabled
        if (Settings.autoUpdate && !Settings.autoUpdateNotification) {
            setInterval(runUpdateCheck, 1000 * 60 * 30); // 30 minutes
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

initPluginManager();
startAllPlugins(StartAt.Init);
init();

document.addEventListener("DOMContentLoaded", () => {
    addVencordUiStyles();

    startAllPlugins(StartAt.DOMContentLoaded);

    // FIXME
    if (IS_DISCORD_DESKTOP && Settings.winNativeTitleBar && IS_WINDOWS) {
        createAndAppendStyle("vencord-native-titlebar-style").textContent = "[class*=titleBar]{display: none!important}";
    }
}, { once: true });
