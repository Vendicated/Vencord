/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "IKnowImMuted",
    description: "Removes that wack ass 'You are currently muted!' tooltip",
    authors: [Devs.Twig, Devs.NickHam13],
    patches: [
        {
            find: "getSpeakingWhileMuted(){return ",
            replacement: {
                match: /(getSpeakingWhileMuted\(\){)(return) (\i)/,
                replace: "$1null"
            }
        }
    ],


});
