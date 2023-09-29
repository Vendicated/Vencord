/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { findOverride, settings } from "./settings";

export default definePlugin({
    name: "CustomSounds",
    description: "Replace Discord's sounds with your own.",
    authors: [Devs.TheKodeToad],
    patches: [
        {
            find: "new Error(\"could not play audio\")",
            replacement: [
                {
                    match: /(?<=new Audio;\i\.src=)\i\([0-9]+\)\(".\/".concat\((\i)\.name,".mp3"\)\);/,
                    replace: "$self.findOverride($1.name)?.url || $&;"
                },
                {
                    match: /Math.min\(\i\.\i\.getOutputVolume\(\)\/100\*(\i)\._volume/,
                    replace: "$& * ($self.findOverride($1.name)?.volume ?? 100) / 100"
                }
            ]
        }
    ],
    settings,
    findOverride
});

