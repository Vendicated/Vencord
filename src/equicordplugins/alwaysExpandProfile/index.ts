/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import definePlugin from "@utils/types";
import { User } from "discord-types/general";

export default definePlugin({
    name: "AlwaysExpandProfile",
    description: "Always display a user's full popout",
    authors: [EquicordDevs.thororen],
    patches: [
        {
            find: '"UserProfilePopout"',
            replacement: {
                match: /(?<=user:(\i).*?"PRESS_VIEW_PROFILE".{0,50})return/,
                replace: "return $self.openUserProfile($1);"
            }
        },
        {
            find: '"BotUserProfilePopout"',
            replacement: {
                match: /(?<=user:(\i).*?"PRESS_VIEW_PROFILE".{0,50})return/,
                replace: "return $self.openUserProfile($1);"
            }
        },
    ],
    openUserProfile(user: User) {
        openUserProfile(user.id);
    }
});
