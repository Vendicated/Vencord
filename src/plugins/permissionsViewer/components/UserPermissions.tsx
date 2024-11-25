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
import { getIntlMessage } from "@utils/discord";
import { classes } from "@utils/misc";
import { filters, findBulk, proxyLazyWebpack } from "@webpack";
import { PermissionsBits, Text, Tooltip, useMemo, UserStore } from "@webpack/common";
import type { Guild, GuildMember } from "discord-types/general";

import { PermissionsSortOrder, settings } from "..";
import { cl, getGuildPermissionSpecMap, getSortedRoles, sortUserRoles } from "../utils";
import openRolesAndUsersPermissionsModal, { PermissionType, type RoleOrUserPermission } from "./RolesAndUsersPermissions";

interface UserPermission {
    permission: string;
    roleName: string;
    roleColor: string;
    rolePosition: number;
}

type UserPermissions = Array<UserPermission>;

const { RoleRootClasses, RoleClasses, RoleBorderClasses } = proxyLazyWebpack(() => {
    const [RoleRootClasses, RoleClasses, RoleBorderClasses] = findBulk(
        filters.byProps("root", "expandButton", "collapseButton"),
        filters.byProps("role", "roleCircle", "roleName"),
        filters.byProps("roleCircle", "dot", "dotBorderColor")
    ) as Record<string, string>[];

    return { RoleRootClasses, RoleClasses, RoleBorderClasses };
});

interface FakeRoleProps extends React.HTMLAttributes<HTMLDivElement> {
    text: string;
    color: string;
}

function FakeRole({ text, color, ...props }: FakeRoleProps) {
    return (
        <div {...props} className={classes(RoleClasses.role)}>
            <div className={RoleClasses.roleRemoveButton}>
                <span
                    className={classes(RoleBorderClasses.roleCircle, RoleClasses.roleCircle)}
                    style={{ backgroundColor: color }}
                />
            </div>
            <div className={RoleClasses.roleName}>
                <Text
                    className={RoleClasses.roleNameOverflow}
                    variant="text-xs/medium"
                >
                    {text}
                </Text>
            </div>
        </div>
    );
}

interface GrantedByTooltipProps {
    roleName: string;
    roleColor: string;
}

function GrantedByTooltip({ roleName, roleColor }: GrantedByTooltipProps) {
    return (
        <>
            <Text variant="text-sm/medium">Granted By</Text>
            <FakeRole text={roleName} color={roleColor} />
        </>
    );
}

function UserPermissionsComponent({ guild, guildMember, closePopout }: { guild: Guild; guildMember: GuildMember; closePopout: () => void; }) {
    const { permissionsSortOrder } = settings.use(["permissionsSortOrder"]);

    const guildPermissionSpecMap = useMemo(() => getGuildPermissionSpecMap(guild), [guild.id]);

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

            const OWNER = getIntlMessage("GUILD_OWNER") ?? "Server Owner";
            userPermissions.push({
                permission: OWNER,
                roleName: "Owner",
                roleColor: "var(--primary-300)",
                rolePosition: Infinity
            });
        }

        sortUserRoles(userRoles);

        for (const bit of Object.values(PermissionsBits)) {
            for (const { permissions, colorString, position, name } of userRoles) {
                if ((permissions & bit) === bit) {
                    userPermissions.push({
                        permission: guildPermissionSpecMap[String(bit)].title,
                        roleName: name,
                        roleColor: colorString || "var(--primary-300)",
                        rolePosition: position
                    });

                    break;
                }
            }
        }

        userPermissions.sort((a, b) => b.rolePosition - a.rolePosition);

        return [rolePermissions, userPermissions];
    }, [permissionsSortOrder]);

    return <div>
        <div className={cl("user-header-container")}>
            <Text variant="eyebrow">Permissions</Text>
            <div className={cl("user-header-btns")}>
                <Tooltip text={`Sorting by ${permissionsSortOrder === PermissionsSortOrder.HighestRole ? "Highest Role" : "Lowest Role"}`}>
                    {tooltipProps => (
                        <div
                            {...tooltipProps}
                            className={cl("user-header-btn")}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                                settings.store.permissionsSortOrder = permissionsSortOrder === PermissionsSortOrder.HighestRole ? PermissionsSortOrder.LowestRole : PermissionsSortOrder.HighestRole;
                            }}
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 96 960 960"
                                transform={permissionsSortOrder === PermissionsSortOrder.HighestRole ? "scale(1 1)" : "scale(1 -1)"}
                            >
                                <path fill="var(--text-normal)" d="M440 896V409L216 633l-56-57 320-320 320 320-56 57-224-224v487h-80Z" />
                            </svg>
                        </div>
                    )}
                </Tooltip>
                <Tooltip text="Role Details">
                    {tooltipProps => (
                        <div
                            {...tooltipProps}
                            className={cl("user-header-btn")}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                                closePopout();
                                openRolesAndUsersPermissionsModal(rolePermissions, guild, guildMember.nick || UserStore.getUser(guildMember.userId).username);
                            }}
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                            >
                                <path fill="var(--text-normal)" d="M7 12.001C7 10.8964 6.10457 10.001 5 10.001C3.89543 10.001 3 10.8964 3 12.001C3 13.1055 3.89543 14.001 5 14.001C6.10457 14.001 7 13.1055 7 12.001ZM14 12.001C14 10.8964 13.1046 10.001 12 10.001C10.8954 10.001 10 10.8964 10 12.001C10 13.1055 10.8954 14.001 12 14.001C13.1046 14.001 14 13.1055 14 12.001ZM19 10.001C20.1046 10.001 21 10.8964 21 12.001C21 13.1055 20.1046 14.001 19 14.001C17.8954 14.001 17 13.1055 17 12.001C17 10.8964 17.8954 10.001 19 10.001Z" />
                            </svg>
                        </div>
                    )}
                </Tooltip>
            </div>
        </div>
        {userPermissions.length > 0 && (
            <div className={classes(RoleRootClasses.root)}>
                {userPermissions.map(({ permission, roleColor, roleName }) => (
                    <Tooltip
                        text={<GrantedByTooltip roleName={roleName} roleColor={roleColor} />}
                        tooltipClassName={cl("granted-by-container")}
                        tooltipContentClassName={cl("granted-by-content")}
                    >
                        {tooltipProps => (
                            <FakeRole {...tooltipProps} text={permission} color={roleColor} />
                        )}
                    </Tooltip>
                ))}
            </div>
        )}
    </div>;
}

export default ErrorBoundary.wrap(UserPermissionsComponent, { noop: true });
