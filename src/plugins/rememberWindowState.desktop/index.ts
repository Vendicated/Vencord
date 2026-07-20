/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative, StartAt } from "@utils/types";

const Native = VencordNative.pluginHelpers.RememberWindowState as PluginNative<typeof import("./native")>;

export default definePlugin({
    name: "RememberWindowState",
    description: "Remember Discord's window position, size, and maximized state.",
    authors: [Devs.bonk],
    startAt: StartAt.Init,

    start() {
        Native.start();
    },

    stop() {
        Native.stop();
    }
});
