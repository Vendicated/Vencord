/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { getCurrentGuild } from "@utils/discord";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { UserStore } from "@webpack/common";

const RolesComponent = findComponentByCodeLazy("user", "currentUser", "guild", "trackUserProfileAction");

export default definePlugin({
    name: "RolesInProfile",
    description: "Allows you to view roles in your profile, without having to scroll a list of members",
    authors: [Devs.relitrix],
    patches: [
        {
            find: /.Messages.STATUS_MENU_LABEL/,
            replacement: {
                match: /hidePersonalInformation:\i,onClose:\i}\)/,
                replace: "$&,$self.Roles(),"
            }
        }
    ],
    Roles() {
        if (!getCurrentGuild()) {
            return;
        }
        const user = UserStore.getCurrentUser();
        return <RolesComponent guild={getCurrentGuild()} currentUser={user} user={user} />;
    },
});
