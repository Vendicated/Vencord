/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "DisableDMCallIdle",
    description: "Disables automatically getting kicked from a DM voice call after 3 minutes.",
    authors: [Devs.Nuckyz],
    patches: [
        {
            find: ".Messages.BOT_CALL_IDLE_DISCONNECT",
            replacement: {
                match: /(?<=function \i\(\){)(?=.{1,100}\.Messages\.BOT_CALL_IDLE_DISCONNECT)/,
                replace: "return;"
            }
        }
    ]
});
