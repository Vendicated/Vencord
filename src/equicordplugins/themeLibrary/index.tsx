/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ColorPaletteIcon } from "@components/Icons";
import SettingsPlugin from "@plugins/_core/settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { openUserSettingsPanel } from "@webpack/common";

import { settings } from "./utils/settings";

export default definePlugin({
    name: "ThemeLibrary",
    description: "A library of themes for Vencord.",
    authors: [EquicordDevs.Fafa],
    settings,
    toolboxActions: {
        "Open Theme Library": () => {
            openUserSettingsPanel("theme_library");
        },
    },

    start() {
        const customEntriesSections = SettingsPlugin.customEntries;

        customEntriesSections.push({
            key: "theme_library",
            title: "Theme Library",
            Component: require("./components/ThemeTab").default,
            Icon: ColorPaletteIcon
        });
    },

    stop() {
        const customEntriesSections = SettingsPlugin.customEntries;
        const i = customEntriesSections.findIndex(entry => entry.key === "theme_library");
        if (i !== -1) customEntriesSections.splice(i, 1);
    },
});
