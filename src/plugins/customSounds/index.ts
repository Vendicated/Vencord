/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { findOverride, isOverriden, settings } from "./settings";

export default definePlugin({
    name: "CustomSounds",
    description: "Replace Discord's sounds with your own.",
    authors: [Devs.TheKodeToad, Devs.SpikeHD],
    patches: [
        // sound class
        {
            find: "Error(\"could not play audio\")",
            replacement: [
                // override URL
                {
                    match: /(?<=new Audio;\i\.src=)\i\("[0-9]+"\)\("\.\.\/\.\.\/sounds\/".concat\(this.name,".mp3"\)/,
                    replace: "$self.findOverride(this.name)?.url || $&"
                },
                // override volume
                {
                    match: /Math.min\(\i\.\i\.getOutputVolume\(\)\/100\*this\._volume/,
                    replace: "$& * ($self.findOverride(this.name)?.volume ?? 100) / 100"
                }
            ]
        },
        // force classic soundpack for overriden sounds
        {
            find: "createSoundForPack:function(){",
            replacement: {
                match: /\i\.\i\.getSoundpack\(\)/,
                replace: "$self.isOverriden(arguments[0]) ? \"classic\" : $&"
            }
        }
    ],
    settings,
    findOverride,
    isOverriden
});

