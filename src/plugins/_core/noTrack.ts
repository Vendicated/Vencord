/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoTrack",
    description: "Disable Discord's tracking ('science'), metrics and Sentry crash reporting",
    authors: [Devs.Cyn, Devs.Ven, Devs.Nuckyz, Devs.Arrow],
    required: true,
    patches: [
        {
            find: "TRACKING_URL:",
            replacement: {
                match: /^.+$/,
                replace: "()=>{}",
            },
        },
        {
            find: "window.DiscordSentry=",
            replacement: {
                match: /^.+$/,
                replace: "()=>{}",
            }
        },
        {
            find: ".METRICS,",
            replacement: [
                {
                    match: /this\._intervalId.+?12e4\)/,
                    replace: ""
                },
                {
                    match: /(?<=increment=function\(\i\){)/,
                    replace: "return;"
                }
            ]
        },
        {
            find: ".installedLogHooks)",
            replacement: {
                match: /if\(\i\.getDebugLogging\(\)&&!\i\.installedLogHooks\)/,
                replace: "if(false)"
            }
        },
    ]
});
