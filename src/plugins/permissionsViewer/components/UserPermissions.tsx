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

import ErrorBoundary from "@components/ErrorBoundary";
import { findByPropsLazy } from "@webpack";
import { PermissionsBits, Text, Tooltip, UserStore, useState } from "@webpack/common";
import { Guild, GuildMember, Role } from "discord-types/general";

import { PermissionsSortOrder, settings } from "..";
import { getPermissionString } from "../formatting";
import openRolesAndUsersPermissionsModal, { PermissionType, RoleOrUserPermission } from "./RolesAndUsersPermissions";

interface UserPermission {
    permission: string;
    roleColor: string;
    rolePosition: number;
}

type UserPermissions = Array<UserPermission>;

const RoleClasses: Record<"roles" | "rolePill" | "rolePillBorder", string> =
    findByPropsLazy("roles", "rolePill", "rolePillBorder");
const RoleCircleClasses: Record<"desaturateUserColors" | "flex" | "alignCenter" | "justifyCenter" | "svg" | "background" | "dot" | "dotBorderColor" | "roleCircle" | "dotBorderBase", string> =
    findByPropsLazy("roleCircle", "dotBorderBase", "dotBorderColor");
const RolePillClasses: Record<"flex" | "alignCenter" | "justifyCenter" | "wrap" | "root" | "role" | "roleRemoveButton" | "roleDot" | "roleFlowerStar" | "roleRemoveIcon" | "roleRemoveIconFocused" | "roleVerifiedIcon" | "roleName" | "roleNameOverflow" | "actionButton" | "overflowButton" | "addButton" | "addButtonIcon" | "overflowRolesPopout" | "overflowRolesPopoutArrowWrapper" | "overflowRolesPopoutArrow" | "popoutBottom" | "popoutTop" | "overflowRolesPopoutHeader" | "overflowRolesPopoutHeaderIcon" | "overflowRolesPopoutHeaderText" | "roleIcon", string> =
    findByPropsLazy("roleNameOverflow", "root", "roleName", "roleRemoveButton");

function UserPermissionsComponent({ guild, guildMember }: { guild: Guild; guildMember: GuildMember; }) {
    const [viewPermissions, setViewPermissions] = useState(settings.store.defaultPermissionsDropdownState);

    const rolePermissions: Array<RoleOrUserPermission> = [];
    const userPermissions: UserPermissions = [];

    const { roles: userRolesIds } = guildMember;
    const { roles } = guild;
    const userRoles = [...userRolesIds.map(id => roles[id]), roles[guild.id]];

    userRoles.sort(({ position: a }, { position: b }) => b - a);

    for (const userRole of userRoles) {
        rolePermissions.push({
            type: PermissionType.Role,
            id: userRole.id,
            permissions: userRole.permissions
        });
    }

    sortUserRoles(userRoles);

    for (const [permission, bit] of Object.entries(PermissionsBits)) {
        for (const userRole of userRoles) {
            if ((userRole.permissions & bit) > 0n) {
                userPermissions.push({
                    permission: getPermissionString(permission),
                    roleColor: userRole.colorString ?? "var(--primary-dark-300)",
                    rolePosition: userRole.position
                });

                break;
            }
        }
    }

    userPermissions.sort(({ rolePosition: a }, { rolePosition: b }) => b - a);

    return (
        <div>
            <div className="permviewer-userperms-title-container">
                <Text className="permviewer-userperms-title" variant="eyebrow">Permissions</Text>
                <div>
                    <Tooltip text="Details">
                        {({ onMouseLeave, onMouseEnter }) => (
                            <svg
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                                className="permviewer-userperms-permdetails-btn"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                onClick={() => openRolesAndUsersPermissionsModal(rolePermissions, guild, guildMember.nick ?? UserStore.getUser(guildMember.userId).username)}
                            >
                                <path fill="var(--text-normal)" d="M7 12.001C7 10.8964 6.10457 10.001 5 10.001C3.89543 10.001 3 10.8964 3 12.001C3 13.1055 3.89543 14.001 5 14.001C6.10457 14.001 7 13.1055 7 12.001ZM14 12.001C14 10.8964 13.1046 10.001 12 10.001C10.8954 10.001 10 10.8964 10 12.001C10 13.1055 10.8954 14.001 12 14.001C13.1046 14.001 14 13.1055 14 12.001ZM19 10.001C20.1046 10.001 21 10.8964 21 12.001C21 13.1055 20.1046 14.001 19 14.001C17.8954 14.001 17 13.1055 17 12.001C17 10.8964 17.8954 10.001 19 10.001Z" />
                            </svg>
                        )}
                    </Tooltip>
                    <Tooltip text="Toggle Permissions">
                        {({ onMouseLeave, onMouseEnter }) => (
                            <svg
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                                className="permviewer-userperms-toggleperms-btn"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                transform={viewPermissions ? "scale(1 -1)" : "scale(1 1)"}
                                onClick={() => setViewPermissions(!viewPermissions)}
                            >
                                <path fill="var(--text-normal)" d="M16.59 8.59003L12 13.17L7.41 8.59003L6 10L12 16L18 10L16.59 8.59003Z" />
                            </svg>
                        )}
                    </Tooltip>
                </div>
            </div>
            {viewPermissions && userPermissions.length > 0 && (
                <div className={[RolePillClasses.root, RoleClasses.roles].join(" ")}>
                    {userPermissions.map(permission => (
                        <div className={[RolePillClasses.role, RoleClasses.rolePill, RoleClasses.rolePillBorder].join(" ")}>
                            <div className={RolePillClasses.roleRemoveButton}>
                                <span className={RoleCircleClasses.roleCircle} style={{ backgroundColor: permission.roleColor }} />
                            </div>
                            <div className={RolePillClasses.roleName}>
                                <Text className={[RolePillClasses.roleNameOverflow].join(" ")} variant="text-xs/medium">{permission.permission}</Text>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function sortUserRoles(roles: Array<Role>) {
    switch (settings.store.permissionsSortOrder) {
        case PermissionsSortOrder.HighestRole: {
            return roles.sort(({ position: a }, { position: b }) => b - a);
        }
        case PermissionsSortOrder.LowestRole: {
            return roles.sort(({ position: a }, { position: b }) => a - b);
        }
        default: {
            return roles;
        }
    }
}

export default ErrorBoundary.wrap(UserPermissionsComponent, { noop: true });
