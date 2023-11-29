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
    authors: [Devs.TheKodeToad, Devs.SpikeHD],
    patches: [
        {
            find: "Error(\"could not play audio\")",
            replacement: [
                {
                    match: /(?<=new Audio;\i\.src=)\i\("[0-9]+"\)\("\.\.\/\.\.\/sounds\/".concat\(this.name,".mp3"\)/,
                    replace: "$self.findOverride(this.name)?.url || $&"
                },
                {
                    match: /Math.min\(\i\.\i\.getOutputVolume\(\)\/100\*this\._volume/,
                    replace: "$& * ($self.findOverride(this.name)?.volume ?? 100) / 100"
                }
            ]
        }
    ],
    settings,
    findOverride
});

