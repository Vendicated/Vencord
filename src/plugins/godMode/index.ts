/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { PermissionStore } from "@webpack/common";

export default definePlugin({
    name: "GodMode",
    description: "Get all permissions (client-side).",
    authors:  [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    start: () => {
        // if commented out then it means it breaks ur discord
        [
            "can",
            "canAccessGuildSettings",
            "canAccessMemberSafetyPage",
            "canBasicChannel",
            "canImpersonateRole",
            "canManageUser",
            "canWithPartialContext",
            // "computeBasicPermissions",
            // "computePermissions",
            "constructor",
            "getChannelPermissions",
            "getChannelsVersion",
            // "getGuildPermissionsProps",
            // "getGuildPermissions",
            "getGuildVersion",
            "getHighestRole",
            "initialize",
            "isRoleHigher",
        ].forEach(a => PermissionStore.__proto__[a] = () => !0);
    },

    stop: () => { }
});
