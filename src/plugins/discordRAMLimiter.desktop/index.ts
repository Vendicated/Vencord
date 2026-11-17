/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";

const logger = new Logger("DiscordRAMLimiter", "#5865F2");
const Native = VencordNative.pluginHelpers?.DiscordRAMLimiter as PluginNative<typeof import("./native")> | undefined;

export default definePlugin({
    name: "DiscordRAMLimiter",
    description: "Trims Discord process memory every 1.5s to reduce RAM usage.",
    authors: [Devs.thegabriel09],
    tags: ["Utility"],
    searchTerms: ["ram", "memory", "ram limiter", "working set"],

    start() {
        if (!Native?.startLimiter) {
            logger.warn("Native helpers unavailable - RAM limiting requires the Discord desktop app.");
            return;
        }

        Native.startLimiter()
            .then(status => logger.info("Limiter started", status))
            .catch(err => logger.error("Failed to start limiter", err));
    },

    stop() {
        Native?.stopLimiter?.()
            .then(() => logger.info("Limiter stopped"))
            .catch(err => logger.error("Failed to stop limiter", err));
    }
});
