/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ComponentsIcon } from "@components/Icons";
import SettingsPlugin from "@plugins/_core/settings";
import { Devs } from "@utils/constants";
import { removeFromArray } from "@utils/misc";
import definePlugin, { StartAt } from "@utils/types";
import { SettingsRouter } from "@webpack/common";

import ComponentsTab from "./components/ComponentsTab";

export default definePlugin({
    name: "Components",
    description: "Adds a new tab to settings to browse Discord components.",
    tags: ["Appearance", "Customisation", "Console", "Developers", "Organisation"],
    authors: [Devs.prism],
    dependencies: ["Settings"],
    startAt: StartAt.WebpackReady,
    toolboxActions: {
        "Open Components Tab"() {
            SettingsRouter.openUserSettings("equicord_components_panel");
        },
    },
    start() {
        SettingsPlugin.customEntries.push({
            key: "equicord_components",
            title: "Components",
            Component: ComponentsTab,
            Icon: ComponentsIcon
        });
    },
    stop() {
        removeFromArray(SettingsPlugin.customEntries, e => e.key === "equicord_components");
    },
});
