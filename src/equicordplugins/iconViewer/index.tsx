/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MagnifyingGlassIcon } from "@components/Icons";
import SettingsPlugin from "@plugins/_core/settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import { openUserSettingsPanel } from "@webpack/common";

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
            openUserSettingsPanel("equicord_icon_viewer");
        },
    },
    settingsAboutComponent: SettingsAbout,
    start() {
        const { customEntries, customSections } = SettingsPlugin;

        customEntries.push({
            key: "equicord_icon_viewer",
            title: "Icon Finder",
            Component: IconsTab,
            Icon: MagnifyingGlassIcon
        });

        customSections.push(() => ({
            section: "EquicordDiscordIcons",
            label: "Icon Finder",
            element: IconsTab,
            className: "vc-discord-icons",
            id: "IconViewer"
        }));
    },
    stop() {
        const { customEntries, customSections } = SettingsPlugin;
        const entry = customEntries.findIndex(entry => entry.key === "equicord_icon_viewer");
        const section = customSections.findIndex(section => section({} as any).id === "IconViewer");
        if (entry !== -1) customEntries.splice(entry, 1);
        if (section !== -1) customSections.splice(section, 1);
    },
});
