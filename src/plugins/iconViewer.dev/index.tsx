/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { SettingsRouter } from "@webpack/common";

// import settings from "../_core/settings";
import IconsTab from "./IconsTab";

export default definePlugin({
    name: "IconViewer",
    description: "Adds a new tab to settings, to preview all icons",
    authors: [],
    dependencies: ["Settings"],
    toolboxActions: {
        "Open Icons Tab"() {
            SettingsRouter.open("VencordDiscordIcons");
        },
    },
    insertSettings() {
        return {
            section: "VencordDiscordIcons",
            label: "Icons",
            element: IconsTab,
            className: "vc-discord-icons",
        };
    },
    start() {
        // @ts-ignore
        Vencord.Plugins.plugins.Settings.customSections.push(this.insertSettings);
    },
    stop() {
        // @ts-ignore
        Vencord.Plugins.plugins.Settings.customSections =
            // @ts-ignore
            Vencord.Plugins.plugins.Settings.customSections.filter(
                x => x !== this.insertSettings
            );
    },
});
