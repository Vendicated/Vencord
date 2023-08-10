/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NSFWGateBypass",
    description: "Allows you to access NSFW channels without setting/verifying your age",
    authors: [Devs.Commandtechno],
    patches: [
        {
            find: ".nsfwAllowed=null",
            replacement: {
                match: /(\w+)\.nsfwAllowed=/,
                replace: "$1.nsfwAllowed=true;",
            },
        },
    ],
});
