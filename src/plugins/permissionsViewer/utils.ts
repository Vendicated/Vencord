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

import { wordsToTitle } from "@utils/text";
import { i18n } from "@webpack/common";
import { Guild, GuildMember } from "discord-types/general";

function formatPermissionWithoutMatchingString(permission: string) {
    return wordsToTitle(permission.toLowerCase().split("_"));
}

export function getPermissionString(permission: string) {
    return i18n.Messages[permission] || formatPermissionWithoutMatchingString(permission);
}

export function getSortedRoles({ roles, id }: Guild, member: GuildMember) {
    return [...member.roles, id]
        .map(id => roles[id])
        .sort((a, b) => b.position - a.position);
}
