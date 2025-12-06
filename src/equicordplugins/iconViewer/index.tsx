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
            openUserSettingsPanel("icon_viewer");
        },
    },
    settingsAboutComponent: SettingsAbout,
    start() {
        const customEntriesSections = SettingsPlugin.customEntries;

        customEntriesSections.push({
            key: "icon_viewer",
            title: "Icon Finder",
            Component: IconsTab,
            Icon: MagnifyingGlassIcon
        });
    },
    stop() {
        const customEntriesSections = SettingsPlugin.customEntries;
        const i = customEntriesSections.findIndex(entry => entry.key === "icon_viewer");
        if (i !== -1) customEntriesSections.splice(i, 1);
    },
});
