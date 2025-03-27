/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";
import { FluxEvents } from "@webpack/types";

const defaultOptions = {
    type: "EXPERIMENT_OVERRIDE_BUCKET" as FluxEvents,
    experimentId: "2024-05_desktop_visual_refresh",
};

export default definePlugin({
    name: "VisualDefresh",
    description: "Removes the new desktop visual refresh.",
    authors: [Devs.Inbestigator],
    dependencies: ["Experiments"],
    tags: ["Experiments"],
    start() {
        FluxDispatcher.dispatch({ ...defaultOptions, experimentBucket: -1 });
    },
    stop() {
        FluxDispatcher.dispatch({ ...defaultOptions, experimentBucket: null });
    },
});
