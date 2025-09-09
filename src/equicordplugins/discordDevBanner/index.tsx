/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

import { makeDevBanner, settings } from "./components";

export default definePlugin({
    name: "DiscordDevBanner",
    description: "Enables the Discord developer banner, in which displays the build-ID",
    authors: [EquicordDevs.KrystalSkull, Devs.thororen],
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
                    match: /children:\[.*?\{\}\)\]/g,
                    replace: "children:$self.makeDevBanner()"
                },
            ]
        }
    ],
    makeDevBanner,
});
