/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { classNameFactory } from "@api/Styles";
import { Guild, GuildMember, Role } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { GuildRoleStore } from "@webpack/common";

import { PermissionsSortOrder, settings } from ".";
import { PermissionType } from "./components/RolesAndUsersPermissions";

export const { getGuildPermissionSpecMap } = findByPropsLazy("getGuildPermissionSpecMap");

export const cl = classNameFactory("vc-permviewer-");

export function getSortedRoles({ id }: Guild, member: GuildMember) {
    const roles = GuildRoleStore.getRoles(id);

    return [...member.roles, id]
        .map(id => roles[id])
        .sort((a, b) => b.position - a.position);
}

export function sortUserRoles(roles: Role[]) {
    switch (settings.store.permissionsSortOrder) {
        case PermissionsSortOrder.HighestRole:
            return roles.sort((a, b) => b.position - a.position);
        case PermissionsSortOrder.LowestRole:
            return roles.sort((a, b) => a.position - b.position);
        default:
            return roles;
    }
}

export function sortPermissionOverwrites<T extends { id: string; type: number; }>(overwrites: T[], guildId: string) {
    const roles = GuildRoleStore.getRoles(guildId);

    return overwrites.sort((a, b) => {
        if (a.type !== PermissionType.Role || b.type !== PermissionType.Role) return 0;

        const roleA = roles[a.id];
        const roleB = roles[b.id];

        return roleB.position - roleA.position;
    });
}
