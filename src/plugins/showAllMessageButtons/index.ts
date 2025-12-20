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
    name: "ShowAllMessageButtons",
    description: "Always show all message buttons no matter if you are holding the shift key or not.",
    authors: [Devs.Nuckyz],

    patches: [
        {
            find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}",
            replacement: {
                // isExpanded: isShiftPressed && other conditions...
                match: /isExpanded:\i&&(.+?),/,
                replace: "isExpanded:$1,"
            }
        }
    ]
});
