/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { moment } from "@webpack/common";

export default definePlugin({
    name: "DontRoundMyTimestamps",
    authors: [Devs.Lexi],
    description: "Always rounds relative timestamps down, so 7.6y becomes 7y instead of 8y",

    start() {
        moment.relativeTimeRounding(Math.floor);
    },

    stop() {
        moment.relativeTimeRounding(Math.round);
    }
});
