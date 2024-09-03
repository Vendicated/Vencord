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
    description: "Allows you to view your roles in your profile, without having to look at your server profile from another place, like the member list",
    authors: [Devs.relitrix],
    patches: [
        {
            find: ".Messages.STATUS_MENU_LABEL",
            replacement: {
                match: /\(0,\i\.jsxs?\)\("div",{className:\i\.menus,(?<=user:(\i).+?)/,
                replace: "$self.Roles({user:$1}),$&"
            }
        }
    ],

    Roles: ErrorBoundary.wrap(({ user }: { user: User; }) => {
        if (!getCurrentGuild()) {
            return;
        }

        return <RolesComponent guild={getCurrentGuild()} currentUser={user} user={user} />;
    })
});
