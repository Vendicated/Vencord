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
    name: "BetterGifPicker",
    description: "Makes the gif picker open the favourite category by default",
    authors: [Devs.Samwich],
    patches: [
        {
            find: '"state",{resultType:',
            replacement: [{
                match: /(?<="state",{resultType:)null/,
                replace: '"Favorites"'
            }]
        }
    ]
});
