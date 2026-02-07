/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "AlwaysExpandProfiles",
    description: "Always expands profile popouts to the full modal",
    authors: [Devs.thororen],
    patches: [
        {
            find: '"view-profile"',
            replacement: {
                match: /("PRESS_VIEW_PROFILE".{0,200})return(?<=userId:(\i\.id).*?)/,
                replace: "$1return $self.openUserModal($2);"
            },
            all: true
        },
    ],
    openUserModal(userId: string) {
        openUserProfile(userId);
    }
});
