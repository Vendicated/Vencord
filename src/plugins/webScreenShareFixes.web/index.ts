/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

export default definePlugin({
    name: "WebScreenShareFixes",
    authors: [Devs.Kaitlyn],
    description: "Removes 2500kbps bitrate cap on chromium and vesktop clients and fixes CPU usage growing endlessly while screensharing.",
    tags: ["Voice"],
    enabledByDefault: true,
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
            find: "ApplicationStreamPreviewUploadManager",
            replacement: {
                match: /removeAttribute\("srcObject"\)(?<=(\i)\..+?)/,
                replace: "pause(),$1.srcObject=null"
            }
        }
    ]
});
