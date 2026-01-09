/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    experimentalAV1Support: {
        type: OptionType.BOOLEAN,
        description: "Enable AV1 codec support. May cause issues like infinitely loading streams",
        default: false
    }
});

export default definePlugin({
    name: "WebScreenShareFixes",
    authors: [Devs.Kaitlyn],
    description: "Removes 2500kbps bitrate cap on chromium and vesktop clients.",
    enabledByDefault: true,
    settings,

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
                },
                {
                    match: /\i\?\[(\i\.\i)\.H265,\i\.\i\.H264,\i\.\i\.VP8,\i\.\i\.VP9\]/,
                    replace: "true?$self.getCodecs($1)"
                }
            ]
        }
    ],

    getCodecs(Codecs: Record<string, string>) {
        const codecs = [Codecs.H265, Codecs.VP9, Codecs.H264, Codecs.VP8];

        if (settings.store.experimentalAV1Support) {
            codecs.unshift("AV1");
        }

        return codecs;
    }
});
