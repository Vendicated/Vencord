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
import { wordsToTitle } from "@utils/text";
import { GuildStore, i18n, Parser } from "@webpack/common";
import { Guild, GuildMember, Role } from "discord-types/general";
import type { ReactNode } from "react";

import { PermissionsSortOrder, settings } from ".";
import { PermissionType, PermissionValue } from "./components/RolesAndUsersPermissions";

export const cl = classNameFactory("vc-permviewer-");

function formatPermissionWithoutMatchingString(permission: string) {
    return wordsToTitle(permission.toLowerCase().split("_"));
}

// because discord is unable to be consistent with their names
const PermissionKeyMap = {
    MANAGE_GUILD: "MANAGE_SERVER",
    MANAGE_GUILD_EXPRESSIONS: "MANAGE_EXPRESSIONS",
    CREATE_GUILD_EXPRESSIONS: "CREATE_EXPRESSIONS",
    MODERATE_MEMBERS: "MODERATE_MEMBER", // HELLOOOO ??????
    STREAM: "VIDEO",
    SEND_VOICE_MESSAGES: "ROLE_PERMISSIONS_SEND_VOICE_MESSAGE",
} as const;

export function getPermissionString(permission: string) {
    permission = PermissionKeyMap[permission] || permission;

    return i18n.Messages[permission] ||
        // shouldn't get here but just in case
        formatPermissionWithoutMatchingString(permission);
}

export function getPermissionDescription(permission: string): ReactNode {
    // DISCORD PLEEEEEEEEAAAAASE IM BEGGING YOU :(
    if (permission === "USE_APPLICATION_COMMANDS")
        permission = "USE_APPLICATION_COMMANDS_GUILD";
    else if (permission === "SEND_VOICE_MESSAGES")
        permission = "SEND_VOICE_MESSAGE_GUILD";
    else if (permission !== "STREAM")
        permission = PermissionKeyMap[permission] || permission;

    const msg = i18n.Messages[`ROLE_PERMISSIONS_${permission}_DESCRIPTION`] as any;
    if (msg?.hasMarkdown)
        return Parser.parse(msg.message);

    if (typeof msg === "string") return msg;

    return "";
}

export function getPermissionValue(permissionBit: bigint, permissions: bigint): PermissionValue;
export function getPermissionValue(permissionBit: bigint, permissions: undefined): undefined;
export function getPermissionValue(permissionBit: bigint, permissions?: bigint): PermissionValue | undefined;
export function getPermissionValue(permissionBit: bigint, permissions?: bigint): PermissionValue | undefined {
    return permissions !== undefined
        ? permissions === 0n ? PermissionValue.Passthrough
            : (permissions & permissionBit) === permissionBit ? PermissionValue.Allow : PermissionValue.Deny
        : undefined;
}

export function getOverwriteValue(permissionBit: bigint, overwriteAllow: bigint, overwriteDeny: bigint): PermissionValue;
export function getOverwriteValue(permissionBit: bigint, overwriteAllow: undefined, overwriteDeny: bigint): PermissionValue;
export function getOverwriteValue(permissionBit: bigint, overwriteAllow: bigint, overwriteDeny: undefined): PermissionValue;
export function getOverwriteValue(permissionBit: bigint, overwriteAllow: undefined, overwriteDeny: undefined): undefined;
export function getOverwriteValue(permissionBit: bigint, overwriteAllow?: bigint, overwriteDeny?: bigint): PermissionValue | undefined;
export function getOverwriteValue(permissionBit: bigint, overwriteAllow?: bigint, overwriteDeny?: bigint): PermissionValue | undefined {
    return overwriteAllow !== undefined || overwriteDeny !== undefined
        ? overwriteAllow !== undefined && (overwriteAllow & permissionBit) === permissionBit ? PermissionValue.Allow
            : overwriteDeny !== undefined && (overwriteDeny & permissionBit) === permissionBit ? PermissionValue.Deny
                : PermissionValue.Passthrough
        : undefined;
}

export function isPermissionValueRelevant<T extends PermissionValue>(permissionValue?: T): permissionValue is Exclude<T, PermissionValue.Passthrough | PermissionValue.Deny> {
    return permissionValue !== undefined && permissionValue !== PermissionValue.Passthrough &&
        permissionValue !== PermissionValue.Deny;
}

export function isOverwriteValueRelevant<T extends PermissionValue>(overwriteValue?: T): overwriteValue is Exclude<T, PermissionValue.Passthrough> {
    return overwriteValue !== undefined && overwriteValue !== PermissionValue.Passthrough;
}

export function getComputedPermissionValue<T extends PermissionValue, U extends PermissionValue>(overwriteValue: T, permissionValue: U): Exclude<T, PermissionValue.Passthrough> | U;
export function getComputedPermissionValue<T extends PermissionValue, U extends PermissionValue>(overwriteValue: undefined, permissionValue: U): U;
export function getComputedPermissionValue<T extends PermissionValue, U extends PermissionValue>(overwriteValue: undefined, permissionValue: undefined): undefined;
export function getComputedPermissionValue<T extends PermissionValue, U extends PermissionValue>(overwriteValue: T | undefined, permissionValue: undefined): Exclude<T, PermissionValue.Passthrough> | undefined;
export function getComputedPermissionValue<T extends PermissionValue, U extends PermissionValue>(overwriteValue: undefined, permissionValue: U | undefined): U | undefined;
export function getComputedPermissionValue<T extends PermissionValue, U extends PermissionValue>(overwriteValue: T | undefined, permissionValue: U | undefined): Exclude<T, PermissionValue.Passthrough> | U | undefined;
export function getComputedPermissionValue<T extends PermissionValue, U extends PermissionValue>(overwriteValue?: T, permissionValue?: U): Exclude<T, PermissionValue.Passthrough> | U | undefined {
    return isOverwriteValueRelevant(overwriteValue) ? overwriteValue : permissionValue;
}

export function getSortedRoles({ id }: Guild, member: GuildMember) {
    const roles = GuildStore.getRoles(id);

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
    const roles = GuildStore.getRoles(guildId);

    return overwrites.sort((a, b) => {
        if (a.type !== PermissionType.Role || b.type !== PermissionType.Role) return 0;

        const roleA = roles[a.id];
        const roleB = roles[b.id];

        return roleB.position - roleA.position;
    });
}
