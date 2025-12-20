/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "DisableCallIdle",
    description: "Disables automatically getting kicked from a DM voice call after 3 minutes and being moved to an AFK voice channel.",
    authors: [Devs.Nuckyz],
    patches: [
        {
            find: "#{intl::BOT_CALL_IDLE_DISCONNECT_2}",
            replacement: {
                match: /,?(?=\i\(this,"idleTimeout",new \i\.\i\))/,
                replace: ";return;"
            }
        },
        {
            find: "handleIdleUpdate(){",
            replacement: {
                match: /(?<=_initialize\(\){)/,
                replace: "return;"
            }
        }
    ]
});
