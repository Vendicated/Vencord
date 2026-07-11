/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "SoundboardUnlocker",
    description: "Allows using soundboard sounds from other guilds without Nitro.",
    authors: [Devs.Adversing],

    patches: [
        {
            find: "canUseSoundboardEverywhere:function",
            replacement: {
                match: /(?<=canUseSoundboardEverywhere:function\(\i\)\{)/,
                replace: "return true;"
            }
        },
        {
            find: "SOUNDBOARD_SOUND_PICKER_UPSELL,upsellViewedTrackingData:",
            replacement: {
                match: /isNitroLocked:!\i(?=},key:\i\.id,items:\i)/,
                replace: "isNitroLocked:false"
            }
        }
    ]
});
