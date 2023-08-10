/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "TimeBarAllActivities",
    description: "Adds the Spotify time bar to all activities if they have start and end timestamps",
    authors: [Devs.obscurity],
    patches: [
        {
            find: "renderTimeBar=function",
            replacement: {
                match: /renderTimeBar=function\((.{1,3})\){.{0,50}?var/,
                replace: "renderTimeBar=function($1){var"
            }
        }
    ],
});
