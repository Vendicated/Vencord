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
import { findByPropsLazy, findLazy } from "@webpack";
import { Text, Tooltip, useState } from "@webpack/common";
import { Guild, GuildMember, Role } from "discord-types/general";

import { PermissionsSortOrder, settings } from "..";
import { getPermissionString } from "../formatting";

interface UserPermission {
    permission: string;
    roleColor: string;
    rolePosition: number;
}

type UserPermissions = Array<UserPermission>;

const Permissions: Record<string, bigint> = findLazy(m => typeof m.ADMINISTRATOR === "bigint");

const RoleClasses: Record<"roles" | "rolePill" | "rolePillBorder", string> =
    findByPropsLazy("roles", "rolePill", "rolePillBorder");
const RoleCircleClasses: Record<"desaturateUserColors" | "flex" | "alignCenter" | "justifyCenter" | "svg" | "background" | "dot" | "dotBorderColor" | "roleCircle" | "dotBorderBase", string> =
    findByPropsLazy("roleCircle", "dotBorderBase", "dotBorderColor");
const RolePillClasses: Record<"flex" | "alignCenter" | "justifyCenter" | "wrap" | "root" | "role" | "roleRemoveButton" | "roleDot" | "roleFlowerStar" | "roleRemoveIcon" | "roleRemoveIconFocused" | "roleVerifiedIcon" | "roleName" | "roleNameOverflow" | "actionButton" | "overflowButton" | "addButton" | "addButtonIcon" | "overflowRolesPopout" | "overflowRolesPopoutArrowWrapper" | "overflowRolesPopoutArrow" | "popoutBottom" | "popoutTop" | "overflowRolesPopoutHeader" | "overflowRolesPopoutHeaderIcon" | "overflowRolesPopoutHeaderText" | "roleIcon", string> =
    findByPropsLazy("roleNameOverflow", "root", "roleName", "roleRemoveButton");

function UserPermissionsComponent({ guild, guildMember }: { guild: Guild; guildMember: GuildMember; }) {
    const [viewPermissions, setViewPermissions] = useState(false);

    const userPermissions: UserPermissions = [];

    if (viewPermissions) {
        const { roles: userRolesIds } = guildMember;
        const { roles } = guild;
        const userRoles = sortUserRoles([...userRolesIds.map(id => roles[id]), roles[guild.id]]);

        for (const [permission, bit] of Object.entries(Permissions)) {
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
    }

    return (
        <div>
            <div className="perm-viewer-user-permissions-title-container">
                <Text className="perm-viewer-user-permissions-title" variant="eyebrow">Permissions</Text>
                <Tooltip text="Toggle Permissions">
                    {({ onMouseLeave, onMouseEnter }) => (
                        <svg
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                            className="perm-viewer-user-permissions-title-toggle-permissions-btn"
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
