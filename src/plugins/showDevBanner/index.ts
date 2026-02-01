/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ShowDevBanner",
    description: "Displays a customizable developer banner with EagleCord and Discord build information.",
    authors: [Devs.Eagle],
    required: true,
    isEagleCord: true,

    patches: [
        {
            find: '"isHideDevBanner"',
            replacement: [
                {
                    match: '"staging"===window.GLOBAL_ENV.RELEASE_CHANNEL',
                    replace: "true"
                },
                {
                    match: /children:\[.*?\{\}\)\]/g,
                    replace: "children:$self.makeDevBanner()"
                },
            ]
        }
    ],
    makeDevBanner,
});

function makeDevBanner(): string {
    const releaseChannel: string = window.GLOBAL_ENV.RELEASE_CHANNEL;

    return `eagleCord v${VERSION} / ${releaseChannel}`;
}
