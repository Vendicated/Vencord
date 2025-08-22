/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { migratePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import definePlugin from "@utils/types";
import { User } from "@vencord/discord-types";

migratePluginSettings("AlwaysExpandProfiles", "AlwaysExpandProfile");
export default definePlugin({
    name: "AlwaysExpandProfiles",
    description: "Always expands profile popouts to the full modal",
    authors: [EquicordDevs.thororen],
    patches: [
        {
            find: '"view-profile"',
            replacement: {
                match: /(user:(\i).*?"PRESS_VIEW_PROFILE".{0,200})return/,
                replace: "$1return $self.openUserProfile($2);"
            },
            all: true
        },
    ],
    openUserProfile(user: User) {
        openUserProfile(user.id);
    }
});
