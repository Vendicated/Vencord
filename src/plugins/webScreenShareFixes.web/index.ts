/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "WebScreenShareFixes",
    authors: [Devs.Kaitlyn],
    description: "Removes 2500kbps bitrate cap on chromium and vesktop clients.",
    enabledByDefault: true,
    patches: [
        {
            find: "x-google-max-bitrate",
            replacement: [
                {
                    match: /"x-google-max-bitrate=".concat\(\i\)/,
                    replace: '"x-google-max-bitrate=".concat("80_000")'
                },
                {
                    match: ";level-asymmetry-allowed=1",
                    replace: ";b=AS:800000;level-asymmetry-allowed=1"
                },
                {
                    match: /;usedtx=".concat\((\i)\?"0":"1"\)/,
                    replace: '$&.concat($1?";stereo=1;sprop-stereo=1":"")'
                }
            ]
        }
    ]
});
