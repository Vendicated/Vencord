/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Guild, GuildMember, Role } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { GuildRoleStore } from "@webpack/common";

import { PermissionsSortOrder, settings } from ".";
import { PermissionType } from "./components/RolesAndUsersPermissions";

export const { getGuildPermissionSpecMap } = findByPropsLazy("getGuildPermissionSpecMap");

export const cl = classNameFactory("vc-permviewer-");

export function getSortedRolesForMember({ id: guildId }: Guild, member: GuildMember) {
    // The guild id is the @everyone role
    return GuildRoleStore
        .getSortedRoles(guildId)
        .filter(role => role.id === guildId || member.roles.includes(role.id));
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
    const roles = GuildRoleStore.getRolesSnapshot(guildId);

    return overwrites.sort((a, b) => {
        if (a.type !== PermissionType.Role || b.type !== PermissionType.Role) return 0;

        const roleA = roles[a.id];
        const roleB = roles[b.id];

        return roleB.position - roleA.position;
    });
}
