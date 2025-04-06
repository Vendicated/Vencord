/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Webpack } from "Vencord";

export default definePlugin({
    name: "OldUIBack",
    authors: [Devs.minsiam],
    description: "Brings back the old client UI (before March 2025)",

    start() {
        Webpack.Common.FluxDispatcher.dispatch({
            type: "EXPERIMENT_OVERRIDE_BUCKET",
            experimentId: "2024-05_desktop_visual_refresh",
            experimentBucket: 0
        });
    },

    stop() {
        Webpack.Common.FluxDispatcher.dispatch({
            type: "EXPERIMENT_OVERRIDE_BUCKET",
            experimentId: "2024-05_desktop_visual_refresh",
            experimentBucket: null
        });
    }
});
