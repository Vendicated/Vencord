/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "DisableOverlaySoundboard",
    description: "Prevents Discord's in-game overlay soundboard from opening.",
    authors: [Devs.AndrewDLO],
    patches: [
        {
            find: 'type:"SOUNDBOARD_SET_OVERLAY_ENABLED",pid:t,enabled:!0,keepOpen:e',
            replacement: [
                {
                    match: /\{type:"SOUNDBOARD_SET_OVERLAY_ENABLED",pid:t,enabled:!0,keepOpen:e\}/,
                    replace: '{type:"SOUNDBOARD_SET_OVERLAY_ENABLED",pid:t,enabled:!1,keepOpen:e}'
                }
            ]
        }
    ]
});
