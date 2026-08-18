/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "EnableUnavailableScreenshare",
    description: "Enables screen sharing variations for users affected by the regional restriction in Brazil",
    tags: ["Voice"],
    authors: [Devs.Cicholas_],

    patches: [
        {
            find: "variations:{1:{videoEnabled:!1},2:{videoEnabled:!1}}",
            replacement: {
                match: /(variations:\{1:\{videoEnabled:)!1(\},2:\{videoEnabled:)!1(?=\}\})/,
                replace: "$1!0$2!0"
            }
        }
    ]
});
