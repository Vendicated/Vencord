/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { settings } from "./settings";

export default definePlugin({
    name: "ShowDevBanner",
    description: "Displays a customizable developer banner with EagleCord and Discord build information.",
    authors: [Devs.Eagle],
    settings,
    required: true,

    patches: [
        {
            find: ".devBanner,",
            replacement: [
                { match: '"staging"===window.GLOBAL_ENV.RELEASE_CHANNEL', replace: "true" },
                {
                    predicate: () => settings.store.removeCloseButton,
                    match: /(\i=\(\)=>)\(.*?\}\);/,
                    replace: "$1null;",
                },
                {
                    match: /\i\.\i\.format\(.{0,30},{buildNumber:(.{0,20})}\)/,
                    replace: "$self.transform($1)",
                },
            ],
        },
    ],

    transform() {
        const releaseChannel: string = window.GLOBAL_ENV.RELEASE_CHANNEL;

        return `eagleCord v${VERSION} / ${releaseChannel}`;
    },
});
