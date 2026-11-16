/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

const settings = definePluginSettings({
    betterCodecs: {
        type: OptionType.BOOLEAN,
        description: "MAY CAUSE ISSUES! Prefer better codecs like AV1 and VP9 when streaming. Should improve quality but may lead to issues like infinitely loading streams.",
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "WebScreenShareFixes",
    authors: [Devs.Kaitlyn],
    description: "Removes 2500kbps bitrate cap on chromium and vesktop clients and fixes CPU usage growing endlessly while screensharing.",
    tags: ["Voice"],
    enabledByDefault: true,
    settings,
    start() {
        FluxDispatcher.dispatch({
            type: "EXPERIMENT_OVERRIDE_BUCKET",
            experimentId: "2026-10-web-screen-share-audio",
            experimentBucket: 1,
        });
    },
    stop() {
        FluxDispatcher.dispatch({
            type: "EXPERIMENT_OVERRIDE_BUCKET",
            experimentId: "2026-10-web-screen-share-audio",
            experimentBucket: null,
        });
    },

    patches: [
        {
            find: "x-google-max-bitrate",
            replacement: [
                {
                    match: /`x-google-max-bitrate=\$\{\i\}`/,
                    replace: '"x-google-max-bitrate=80000"'
                },
            ]
        },
        {
            find: 'case"video":(',
            predicate: () => settings.store.betterCodecs,
            replacement: {
                match: /\i\?\[(\i\.\i)\.H265,\i\.\i\.H264,\i\.\i\.VP8,\i\.\i\.VP9\]:\[\i\.\i\.H264,\i\.\i\.VP8,\i\.\i\.VP9\]/,
                replace: '["AV1",$1.VP9,$1.H264,$1.VP8]'
            }
        },
        {
            find: "ApplicationStreamPreviewUploadManager",
            replacement: {
                match: /removeAttribute\("srcObject"\)(?<=(\i)\..+?)/,
                replace: "pause(),$1.srcObject=null"
            }
        }
    ]
});
