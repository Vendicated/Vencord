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
import ExpandableHeader from "@components/ExpandableHeader";
import { proxyLazy } from "@utils/lazy";
import { classes } from "@utils/misc";
import { filters, findBulk } from "@webpack";
import { i18n, PermissionsBits, Text, useMemo, UserStore } from "@webpack/common";
import type { Guild, GuildMember } from "discord-types/general";

import { getPermissionString, getSortedRoles, sortUserRoles } from "../utils";
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
            <ExpandableHeader
                headerText="Permissions"
                meatBallMenuTooltipText="Role Details"
                onMeatBallMenuClick={() =>
                    openRolesAndUsersPermissionsModal(
                        rolePermissions,
                        guild,
                        guildMember.nick || UserStore.getUser(guildMember.userId).username
                    )
                }

            >
                {userPermissions.length > 0 && (
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
            </ExpandableHeader>



        </div>
    );
}

export default ErrorBoundary.wrap(UserPermissionsComponent, { noop: true });
