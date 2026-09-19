/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "AlwaysExpandProfiles",
    description: "Always expands profile popouts to the full modal",
    tags: ["Appearance", "Utility"],
    authors: [Devs.thororen],
    patches: [
        {
            find: '"view-profile"',
            replacement: {
                match: /(\i)=.{0,45}\(0,\i\.openUserProfileModal.{0,300}(?=return)/,
                replace: "$&return $1();"
            },
            all: true
        },
    ],
});
