/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { migratePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

// By default Discord only seems to only display 'Staging' so we map the names ourself
const names: Record<string, string> = {
    stable: "Stable",
    ptb: "PTB",
    canary: "Canary",
    staging: "Staging"
};

// Useless for the normal User, but useful for me
migratePluginSettings("DiscordDevBanner", "devBanner");

export default definePlugin({
    name: "DiscordDevBanner",
    description: "Enables the Discord developer banner, in which displays the build-ID",
    authors: [EquicordDevs.KrystalSkull],

    patches: [
        {
            find: ".devBanner,",
            replacement: [
                {
                    match: '"staging"===window.GLOBAL_ENV.RELEASE_CHANNEL',
                    replace: "true"
                },
                {
                    match: /(\i=\(\)=>)\(.*?\}\);/,
                    replace: "$1null;"
                },
                {
                    match: /\i\.\i\.format\(.{0,15},{buildNumber:(.{0,10})}\)/,
                    replace: "$self.transform($1)"
                },
            ]
        }
    ],

    transform(buildNumber: string) {
        const releaseChannel: string = window.GLOBAL_ENV.RELEASE_CHANNEL;

        if (names[releaseChannel]) {
            return `${names[releaseChannel]} ${buildNumber}`;
        } else {
            return `${releaseChannel.charAt(0).toUpperCase() + releaseChannel.slice(1)} ${buildNumber}`;
        }
    },
});
