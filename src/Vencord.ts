export * as Plugins from "./plugins";
export * as Webpack from "./webpack";
export * as Api from "./api";
import { popNotice, showNotice } from "./api/Notices";
import { Settings } from "./api/settings";
import { startAllPlugins } from "./plugins";

export { Settings };

import "./utils/patchWebpack";
import "./utils/quickCss";
import { checkForUpdates, UpdateLogger } from './utils/updater';
import { onceReady } from "./webpack";
import { Router } from "./webpack/common";

export let Components;

async function init() {
    await onceReady;
    startAllPlugins();
    Components = await import("./components");

    try {
        const isOutdated = await checkForUpdates();
        if (isOutdated && Settings.notifyAboutUpdates)
            setTimeout(() => {
                showNotice(
                    "A Vencord update is available!",
                    "View Update",
                    () => {
                        popNotice();
                        Router.open("Vencord");
                    }
                );
            }, 10000);
    } catch (err) {
        UpdateLogger.error("Failed to check for updates", err);
    }
}

init();
