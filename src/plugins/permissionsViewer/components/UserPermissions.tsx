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
import { proxyLazy } from "@utils/lazy";
import { classes } from "@utils/misc";
import { filters, findBulk } from "@webpack";
import { i18n, PermissionsBits, Text, Tooltip, useMemo, UserStore, useState } from "@webpack/common";
import type { Guild, GuildMember } from "discord-types/general";

import { settings } from "..";
import { cl, getPermissionString, getSortedRoles, sortUserRoles } from "../utils";
import openRolesAndUsersPermissionsModal, { PermissionType, type RoleOrUserPermission } from "./RolesAndUsersPermissions";

interface UserPermission {
    permission: string;
    roleColor: string;
    rolePosition: number;
}

type UserPermissions = Array<UserPermission>;

const Classes = proxyLazy(() => {
    const modules = findBulk(
        filters.byProps("roles", "rolePill", "rolePillBorder"),
        filters.byProps("roleCircle", "dotBorderBase", "dotBorderColor"),
        filters.byProps("roleNameOverflow", "root", "roleName", "roleRemoveButton")
    );

    return Object.assign({}, ...modules);
}) as Record<"roles" | "rolePill" | "rolePillBorder" | "desaturateUserColors" | "flex" | "alignCenter" | "justifyCenter" | "svg" | "background" | "dot" | "dotBorderColor" | "roleCircle" | "dotBorderBase" | "flex" | "alignCenter" | "justifyCenter" | "wrap" | "root" | "role" | "roleRemoveButton" | "roleDot" | "roleFlowerStar" | "roleRemoveIcon" | "roleRemoveIconFocused" | "roleVerifiedIcon" | "roleName" | "roleNameOverflow" | "actionButton" | "overflowButton" | "addButton" | "addButtonIcon" | "overflowRolesPopout" | "overflowRolesPopoutArrowWrapper" | "overflowRolesPopoutArrow" | "popoutBottom" | "popoutTop" | "overflowRolesPopoutHeader" | "overflowRolesPopoutHeaderIcon" | "overflowRolesPopoutHeaderText" | "roleIcon", string>;

function UserPermissionsComponent({ guild, guildMember }: { guild: Guild; guildMember: GuildMember; }) {
    const [viewPermissions, setViewPermissions] = useState(settings.store.defaultPermissionsDropdownState);

    const [rolePermissions, userPermissions] = useMemo(() => {
        const userPermissions: UserPermissions = [];

        const userRoles = getSortedRoles(guild, guildMember);

        const rolePermissions: Array<RoleOrUserPermission> = userRoles.map(role => ({
            type: PermissionType.Role,
            ...role
        }));

        if (guild.ownerId === guildMember.userId) {
            rolePermissions.push({
                type: PermissionType.Owner,
                permissions: Object.values(PermissionsBits).reduce((prev, curr) => prev | curr, 0n)
            });

            const OWNER = i18n.Messages.GUILD_OWNER || "Server Owner";
            userPermissions.push({
                permission: OWNER,
                roleColor: "var(--primary-300)",
                rolePosition: Infinity
            });
        }

        sortUserRoles(userRoles);

        for (const [permission, bit] of Object.entries(PermissionsBits)) {
            for (const { permissions, colorString, position, name } of userRoles) {
                if ((permissions & bit) === bit) {
                    userPermissions.push({
                        permission: getPermissionString(permission),
                        roleColor: colorString || "var(--primary-300)",
                        rolePosition: position
                    });

                    break;
                }
            }
        }

        userPermissions.sort((a, b) => b.rolePosition - a.rolePosition);

        return [rolePermissions, userPermissions];
    }, []);

    const { root, role, roleRemoveButton, roleNameOverflow, roles, rolePill, rolePillBorder, roleCircle, roleName } = Classes;

    return (
        <div>
            <div className={cl("userperms-title-container")}>
                <Text className={cl("userperms-title")} variant="eyebrow">Permissions</Text>

                <div>
                    <Tooltip text="Role Details">
                        {tooltipProps => (
                            <button
                                {...tooltipProps}
                                className={cl("userperms-permdetails-btn")}
                                onClick={() =>
                                    openRolesAndUsersPermissionsModal(
                                        rolePermissions,
                                        guild,
                                        guildMember.nick || UserStore.getUser(guildMember.userId).username
                                    )
                                }
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                >
                                    <path fill="var(--text-normal)" d="M7 12.001C7 10.8964 6.10457 10.001 5 10.001C3.89543 10.001 3 10.8964 3 12.001C3 13.1055 3.89543 14.001 5 14.001C6.10457 14.001 7 13.1055 7 12.001ZM14 12.001C14 10.8964 13.1046 10.001 12 10.001C10.8954 10.001 10 10.8964 10 12.001C10 13.1055 10.8954 14.001 12 14.001C13.1046 14.001 14 13.1055 14 12.001ZM19 10.001C20.1046 10.001 21 10.8964 21 12.001C21 13.1055 20.1046 14.001 19 14.001C17.8954 14.001 17 13.1055 17 12.001C17 10.8964 17.8954 10.001 19 10.001Z" />
                                </svg>
                            </button>
                        )}
                    </Tooltip>

                    <Tooltip text={viewPermissions ? "Hide Permissions" : "View Permissions"}>
                        {tooltipProps => (
                            <button
                                {...tooltipProps}
                                className={cl("userperms-toggleperms-btn")}
                                onClick={() => setViewPermissions(v => !v)}
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    transform={viewPermissions ? "scale(1 -1)" : "scale(1 1)"}
                                >
                                    <path fill="var(--text-normal)" d="M16.59 8.59003L12 13.17L7.41 8.59003L6 10L12 16L18 10L16.59 8.59003Z" />
                                </svg>
                            </button>
                        )}
                    </Tooltip>
                </div>
            </div>

            {viewPermissions && userPermissions.length > 0 && (
                <div className={classes(root, roles)}>
                    {userPermissions.map(({ permission, roleColor }) => (
                        <div className={classes(role, rolePill, rolePillBorder)}>
                            <div className={roleRemoveButton}>
                                <span
                                    className={roleCircle}
                                    style={{ backgroundColor: roleColor }}
                                />
                            </div>
                            <div className={roleName}>
                                <Text
                                    className={roleNameOverflow}
                                    variant="text-xs/medium"
                                >
                                    {permission}
                                </Text>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ErrorBoundary.wrap(UserPermissionsComponent, { noop: true });
