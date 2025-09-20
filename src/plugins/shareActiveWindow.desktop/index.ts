/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";

const Native = VencordNative.pluginHelpers.ShareActiveWindow as PluginNative<typeof import("./native")>;

let activeWindowInterval: NodeJS.Timeout | undefined;

export default definePlugin({
    name: "ShareActiveWindow",
    description: "Auto-switch to active window during screen sharing",
    authors: [Devs.ipasechnikov],

    async start() {
        await Native.initActiveWindow();
        activeWindowInterval = setInterval(async () => {
            const activeWindow = await Native.getActiveWindow();
            if (activeWindow) {
                console.log("Window title:", activeWindow.title);
                console.log("Application:", activeWindow.application);
                console.log("Application path:", activeWindow.path);
                console.log("Application PID:", activeWindow.pid);
                console.log("Application icon:", activeWindow.icon);
            }
        }, 1000);
        console.log("Hello from ShareActiveWindow plugin!");
    },

    stop() {
        if (activeWindowInterval) {
            clearInterval(activeWindowInterval);
        }
        console.log("Bye from ShareActiveWindow plugin!");
    },
});
