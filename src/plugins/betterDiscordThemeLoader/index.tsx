/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import definePlugin from "@utils/types";
import settings from "plugins/_core/settings";

import BetterDiscordThemesTab from "./BetterDiscordThemesTab";

settings.customSections.push(() => {
    return {
        section: "BetterDiscordThemes",
        label: "BD Themes",
        element: BetterDiscordThemesTab,
        className: "vc-betterdiscordthemes-settings"
    };
});

export default definePlugin({
    name: "BetterDiscord Themes",
    description: "This plugin allows you to change themes from BetterDiscord with one click",

    authors: [
        {
            id: 272683334755418113n,
            name: "CREAsTIVE",
        },
    ],
    // Delete these two below if you are only using code patches
    start() {

    },

    stop() { },
});
