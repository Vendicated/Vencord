/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";

import { loadScripts, settings } from "./settings";

const Native = VencordNative.pluginHelpers.ActivityUserScripts as PluginNative<typeof import("./native")>;

export default definePlugin({
    name: "ActivityUserScripts",
    description: "Run user-managed scripts in Discord Activity frames",
    tags: ["Activity", "Developers", "Utility"],
    authors: [Devs.kozika],
    settings,

    async start() {
        Native?.syncScripts?.(await loadScripts())?.catch(() => null);
    },

    notifyScriptExecuted(name: string, activityId: string) {
        showNotification({
            title: "Activity UserScript executed",
            body: `${name} ran in ${activityId}`,
            color: "var(--green-360)",
            noPersist: true,
        });
    },
});
