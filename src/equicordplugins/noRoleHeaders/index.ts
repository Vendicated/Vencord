/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoRoleHeaders",
    description: "We are all equal!!",
    authors: [Devs.Samwich],
    patches: [
        {
            find: "._areActivitiesExperimentallyHidden=(",
            replacement: {
                match: /NumberFormat\(.{0,50}\]\);(?=.{0,100}\.memberGroupsPlaceholder)/,
                replace: "$&return null;"
            }
        }
    ]
});
