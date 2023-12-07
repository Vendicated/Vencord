/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    platform: {
        type: OptionType.SELECT,
        description: "What platform to show up as on",
        restartNeeded: true,
        options: [
            {
                label: "Desktop",
                value: "desktop",
                default: true
            },
            {
                label: "Web",
                value: "web"
            },
            { // DISCORD CAN DETECT IF YOU'RE NOT ACTUALLY ON MOBILE, PERHAPS THIS OPTION SHOULD BE REMOVED
                label: "Mobile",
                value: "mobile"
            }
        ]
    }
});

export default definePlugin({
    name: "PlatformSpoofer",
    description: "Spoof what platform or device you're on",
    authors: [Devs.Drag],
    settings: settings,
    patches: [
        {
            find: "_doIdentify(){",
            replacement: {
                match: /(\[IDENTIFY\].*let.{0,5}=\{.*properties:)(.*),presence/,
                replace: "$1{...$2,...$self.getPlatform()},presence"
            }
        }
    ],
    getPlatform: () => {
        switch (settings.store.platform ?? "desktop") {
            case "desktop":
                return { browser: "Discord Client" };
            case "web":
                return { browser: "Chrome" };
            // DISCORD CAN DETECT IF YOU'RE NOT ACTUALLY ON MOBILE, PERHAPS THIS OPTION SHOULD BE REMOVED
            case "mobile":
                return { browser: "Discord iOS" };
        }

    }
});
