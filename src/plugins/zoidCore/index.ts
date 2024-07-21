/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./utils/quickCss";
import "./webpack/patchWebpack";

import { showNotification } from "@api/Notifications";
import { Settings } from "@api/Settings";
import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";
import { Devs } from "@utils/constants";
import { relaunch } from "@utils/native";
import definePlugin from "@utils/types";
import { checkForUpdates, checkImportantUpdate, update, UpdateLogger } from "@utils/updater";

export default definePlugin({
    name: "ZoidCore",
    description: "Core functions for Zoidcord",
    authors: [Devs.Zoid],
    required: true,
    start() {
        setInterval(async function () {
            if (!IS_WEB && !IS_UPDATER_DISABLED) {
                console.info("ZoidCore: Checking for updates...");
                try {
                    const isOutdated = await checkForUpdates();
                    if (!isOutdated) return;
                    const isImportant = await checkImportantUpdate();

                    if (Settings.autoUpdate || isImportant) {
                        await update();
                        if (Settings.autoUpdateNotification && !isImportant)
                            setTimeout(() => showNotification({
                                title: "Zoidcord has been updated!",
                                body: "Click here to restart",
                                permanent: true,
                                noPersist: true,
                                onClick: relaunch
                            }), 10_000);
                        if (isImportant) {
                            setTimeout(() => {
                                showNotification({
                                    title: "Zoidcord has been updated!",
                                    body: "Important update prioritized, restarting in 10 seconds.",
                                    permanent: true,
                                    noPersist: true,
                                });
                                setTimeout(() => relaunch(), 10_000);
                            }, 10_000);
                        }
                        return;
                    }

                    setTimeout(() => showNotification({
                        title: "A Zoidcord update is available!",
                        body: "Click here to view the update",
                        permanent: true,
                        noPersist: true,
                        onClick: openUpdaterModal!
                    }), 10_000);
                } catch (err) {
                    UpdateLogger.error("Failed to check for updates", err);
                }
            }
        }, 1800000);
    },
});
