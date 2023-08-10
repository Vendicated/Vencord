/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "BANger",
    description: "Replaces the GIF in the ban dialogue with a custom one.",
    authors: [Devs.Xinto, Devs.Glitch],
    patches: [
        {
            find: "BAN_CONFIRM_TITLE.",
            replacement: {
                match: /src:\w\(\d+\)/g,
                replace: "src: Vencord.Settings.plugins.BANger.source"
            }
        }
    ],
    options: {
        source: {
            description: "Source to replace ban GIF with (Video or Gif)",
            type: OptionType.STRING,
            default: "https://i.imgur.com/wp5q52C.mp4",
            restartNeeded: true,
        }
    }
});
