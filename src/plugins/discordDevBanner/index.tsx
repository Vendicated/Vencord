/* eslint-disable simple-header/header */
/* eslint-disable no-duplicate-imports */
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    removeCloseButton: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove redundant close button, which might actually break plugin if accidentally pressed",
        restartNeeded: true,
        hidden: true,
    }
});


// By default Discord only seems too displays 'Staging' so we map the names ourself
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
    authors: [
        // Import from EquicordDevs for Equicord
        { name: "krystalskullofficial", id: 929208515883569182n },
    ],
    settings,

    patches: [
        {
            find: ".devBanner,",
            replacement: [
                {
                    match: '"staging"===window.GLOBAL_ENV.RELEASE_CHANNEL',
                    replace: "true"
                },
                {
                    predicate:() => settings.store.removeCloseButton,
                    match: /(\i=\(\)=>)\(.*?\}\);/,
                    replace: "$1null;",
                },
                {
                    match: /\i\.\i\.format\(.{0,15},{buildNumber:(.{0,10})}\)/,
                    replace: "$self.transform($1)"
                }
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
