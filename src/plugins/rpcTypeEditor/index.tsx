/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "RPCTypeEditor",
    description: "Allows editing the type of any Rich Presence. (Configure in settings)",
    authors: [Devs.nin0dev],

    patches: [
        {
            find: "LocalActivityStore",
            replacement: {
                match: /LOCAL_ACTIVITY_UPDATE:function\((\i)\)\{/,
                replace: "$&$self.patchActivity($1.activity);",
            }
        }
    ],
    patchActivity(activity: any) {
        activity.type = 2;
    },
});
