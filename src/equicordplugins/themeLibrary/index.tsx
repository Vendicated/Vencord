/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { SettingsRouter } from "@webpack/common";

import { settings } from "./utils/settings";

export default definePlugin({
    name: "ThemeLibrary",
    description: "A library of themes for Vencord.",
    authors: [
        {
            name: "Fafa",
            id: 428188716641812481n,
        },
    ],
    settings,
    toolboxActions: {
        "Open Theme Library": () => {
            SettingsRouter.open("ThemeLibrary");
        },
    },

    start() {
        const customSettingsSections = (
            Vencord.Plugins.plugins.Settings as any as {
                customSections: ((ID: Record<string, unknown>) => any)[];
            }
        ).customSections;

        const ThemeSection = () => ({
            section: "ThemeLibrary",
            label: "Theme Library",
            searchableTitles: ["Theme Library"],
            element: require("./components/ThemeTab").default,
            id: "ThemeSection",
        });

        customSettingsSections.push(ThemeSection);
    },

    stop() {
        const customSettingsSections = (
            Vencord.Plugins.plugins.Settings as any as {
                customSections: ((ID: Record<string, unknown>) => any)[];
            }
        ).customSections;

        const i = customSettingsSections.findIndex(
            section => section({}).id === "ThemeSection"
        );

        if (i !== -1) customSettingsSections.splice(i, 1);
    },
});
