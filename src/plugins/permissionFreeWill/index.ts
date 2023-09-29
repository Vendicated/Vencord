/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "PermissionFreeWill",
    description: "Disables the client-side restrictions for channel permission management.",
    authors: [Devs.lewisakura],

    patches: [
        // Permission lockout, just set the check to true
        {
            find: "Messages.SELF_DENY_PERMISSION_BODY",
            replacement: [
                {
                    match: /"Unexpected boolean action".{5,20}allow.{5,20}.{80,100}if\(/,
                    replace: "$&true||"
                }
            ]
        },
        // Onboarding, same thing but we need to prevent the check
        {
            find: "Messages.ONBOARDING_CHANNEL_THRESHOLD_WARNING",
            replacement: [
                {
                    match: /case 1:if\((?=!\i\.sent)/,
                    replace: "$&false&&"
                }
            ]
        }
    ]
});
