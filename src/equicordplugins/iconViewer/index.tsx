/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import { SettingsRouter } from "@webpack/common";

import IconsTab from "./IconsTab";
import { SettingsAbout } from "./subComponents";


export default definePlugin({
    name: "IconViewer",
    description: "Adds a new tab to settings, to preview all icons",
    authors: [EquicordDevs.iamme],
    dependencies: ["Settings"],
    startAt: StartAt.WebpackReady,
    toolboxActions: {
        "Open Icons Tab"() {
            SettingsRouter.open("VencordDiscordIcons");
        },
    },
    settingsAboutComponent: SettingsAbout,
    start() {
        const customSettingsSections = (
            Vencord.Plugins.plugins.Settings as any as {
                customSections: ((ID: Record<string, unknown>) => any)[];
            }
        ).customSections;

        const IconViewerSection = () => ({
            section: "VencordDiscordIcons",
            label: "Icons",
            element: IconsTab,
            className: "vc-discord-icons",
            id: "IconViewer"
        });

        customSettingsSections.push(IconViewerSection);
    },
    stop() {
        const customSettingsSections = (
            Vencord.Plugins.plugins.Settings as any as {
                customSections: ((ID: Record<string, unknown>) => any)[];
            }
        ).customSections;

        const i = customSettingsSections.findIndex(section => section({}).id === "IconViewer");
        if (i !== -1) customSettingsSections.splice(i, 1);
    },
});
