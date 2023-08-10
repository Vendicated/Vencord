/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ShowAllMessageButtons",
    description: "Always show all message buttons no matter if you are holding the shift key or not.",
    authors: [Devs.Nuckyz],

    patches: [
        {
            find: ".Messages.MESSAGE_UTILITIES_A11Y_LABEL",
            replacement: {
                // isExpanded: V, (?<=,V = shiftKeyDown && !H...,|;)
                match: /isExpanded:(\i),(?<=,\1=\i&&(?=(!.+?)[,;]).+?)/,
                replace: "isExpanded:$2,"
            }
        }
    ]
});
