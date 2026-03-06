/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Notice } from "@components/Notice";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";

const settings = definePluginSettings({
    platform: {
        type: OptionType.SELECT,
        description: "What platform to show up as on",
        restartNeeded: true,
        options: [
            {
                label: "Desktop",
                value: "desktop",
                default: true,
            },
            {
                label: "Web",
                value: "web",
            },
            {
                label: "Android",
                value: "android"
            },
            {
                label: "iOS",
                value: "ios"
            },
            {
                label: "Xbox",
                value: "xbox",
            },
            {
                label: "Playstation",
                value: "playstation",
            },
            {
                label: "VR",
                value: "vr",
            },
        ]
    }
});

export default definePlugin({
    name: "PlatformSpoofer",
    description: "Spoof what platform or device you're on",
    authors: [EquicordDevs.Drag, EquicordDevs.neoarz],
    settingsAboutComponent: () => (
        <Notice.Warning>
            We can't guarantee this plugin won't get you warned or banned.
        </Notice.Warning>
    ),
    settings: settings,
    patches: [
        {
            find: "_doIdentify(){",
            replacement: {
                match: /(\[IDENTIFY\].*let.{0,5}=\{.*properties:)(.*),presence/,
                replace: "$1{...$2,...$self.getPlatform(true)},presence"
            }
        },
        {
            find: '("AppSkeleton");',
            replacement: {
                match: /(?<=\.isPlatformEmbedded.{0,50}\i\)\)\}.{0,30})\i\?\i\.\i\.set\(.{0,10}:/,
                replace: ""
            }
        }
    ],
    getPlatform(bypass, userId?: any) {
        const platform = settings.store.platform ?? "desktop";

        if (bypass || userId === UserStore.getCurrentUser().id) {
            switch (platform) {
                case "desktop":
                    return { browser: "Discord Client" };
                case "web":
                    return { browser: "Discord Web" };
                case "ios":
                    return { browser: "Discord iOS" };
                case "android":
                    return { browser: "Discord Android" };
                case "xbox":
                    return { browser: "Discord Embedded" };
                case "playstation":
                    return { browser: "Discord Embedded" };
                case "vr":
                    return { browser: "Discord VR" };
                default:
                    return null;
            }
        }

        return null;
    }
});
