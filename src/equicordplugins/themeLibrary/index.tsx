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
        const { customEntries, customSections } = SettingsPlugin;

        customEntries.push({
            key: "equicord_theme_library",
            title: "Theme Library",
            Component: require("./components/ThemeTab").default,
            Icon: ColorPaletteIcon
        });

        customSections.push(() => ({
            section: "EquicordThemeLibrary",
            label: "Theme Library",
            searchableTitles: ["Theme Library"],
            element: require("./components/ThemeTab").default,
            id: "ThemeLibrary",
        }));
    },

    stop() {
        const { customEntries, customSections } = SettingsPlugin;
        const entry = customEntries.findIndex(entry => entry.key === "equicord_theme_library");
        const section = customSections.findIndex(section => section({} as any).id === "ThemeLibrary");
        if (entry !== -1) customEntries.splice(entry, 1);
        if (section !== -1) customSections.splice(section, 1);
    },
});
