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

import { classNameFactory } from "@utils/css";
import { Guild, GuildMember, Role } from "@vencord/discord-types";
import { PermissionOverwriteType } from "@vencord/discord-types/enums";
import { GuildRoleStore, PermissionsBits } from "@webpack/common";

import { PermissionsSortOrder, settings } from ".";

export const cl = classNameFactory("vc-permviewer-");

type PermissionSpec = {
    title: string;
    description: string;
};

const WORD_REPLACEMENTS: Record<string, string> = {
    GUILD: "Server",
    VAD: "Voice Activity",
    TTS: "Text-To-Speech",
    DMS: "DMs"
};

const PERMISSION_TITLES: Partial<Record<keyof typeof PermissionsBits, string>> = {
    CREATE_INSTANT_INVITE: "Create Invite",
    MANAGE_GUILD: "Manage Server",
    MANAGE_GUILD_EXPRESSIONS: "Manage Expressions",
    CREATE_GUILD_EXPRESSIONS: "Create Expressions",
    VIEW_GUILD_ANALYTICS: "View Server Insights",
    VIEW_CREATOR_MONETIZATION_ANALYTICS: "View Creator Monetization Insights",
    MODERATE_MEMBERS: "Timeout Members"
};

function formatPermissionName(name: keyof typeof PermissionsBits) {
    return PERMISSION_TITLES[name] ?? name
        .split("_")
        .map(part => WORD_REPLACEMENTS[part] ?? (part[0] + part.slice(1).toLowerCase()))
        .join(" ");
}

let guildPermissionSpecMap: Record<string, PermissionSpec> | undefined;

export function getGuildPermissionSpecMap(_guild: Guild) {
    guildPermissionSpecMap ??= Object.fromEntries(
        Object.entries(PermissionsBits).map(([permission, bit]) => [
            String(bit),
            {
                title: formatPermissionName(permission as keyof typeof PermissionsBits),
                description: formatPermissionName(permission as keyof typeof PermissionsBits)
            } satisfies PermissionSpec
        ])
    ) as Record<string, PermissionSpec>;

    return guildPermissionSpecMap;
}

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
        if (a.type !== PermissionOverwriteType.ROLE || b.type !== PermissionOverwriteType.ROLE) return 0;

        const roleA = roles[a.id];
        const roleB = roles[b.id];

        return roleB.position - roleA.position;
    });
}
