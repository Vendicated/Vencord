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
import { Flex } from "@components/Flex";
import { InfoIcon, OwnerCrownIcon } from "@components/Icons";
import { getUniqueUsername } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByCodeLazy } from "@webpack";
import { Clipboard, ContextMenuApi, FluxDispatcher, GuildMemberStore, GuildStore, i18n, Menu, PermissionsBits, ScrollerThin, Text, Tooltip, useEffect, UserStore, useState, useStateFromStores } from "@webpack/common";
import { UnicodeEmoji } from "@webpack/types";
import type { Guild, Role, User } from "discord-types/general";

import { settings } from "..";
import { cl, getPermissionDescription, getPermissionString } from "../utils";
import { PermissionAllowedIcon, PermissionDefaultIcon, PermissionDeniedIcon } from "./icons";

export const enum PermissionType {
    Role = 0,
    User = 1,
    Owner = 2
}

export interface RoleOrUserPermission {
    type: PermissionType;
    id?: string;
    permissions?: bigint;
    overwriteAllow?: bigint;
    overwriteDeny?: bigint;
}

type GetRoleIconData = (role: Role, size: number) => { customIconSrc?: string; unicodeEmoji?: UnicodeEmoji; };
const getRoleIconData: GetRoleIconData = findByCodeLazy("convertSurrogateToName", "customIconSrc", "unicodeEmoji");

function getRoleIconSrc(role: Role) {
    const icon = getRoleIconData(role, 20);
    if (!icon) return;

    const { customIconSrc, unicodeEmoji } = icon;
    return customIconSrc ?? unicodeEmoji?.url;
}

function RolesAndUsersPermissionsComponent({ permissions, guild, modalProps, header }: { permissions: Array<RoleOrUserPermission>; guild: Guild; modalProps: ModalProps; header: string; }) {
    permissions.sort((a, b) => a.type - b.type);

    useStateFromStores(
        [GuildMemberStore],
        () => GuildMemberStore.getMemberIds(guild.id),
        null,
        (old, current) => old.length === current.length
    );

    useEffect(() => {
        const usersToRequest = permissions
            .filter(p => p.type === PermissionType.User && !GuildMemberStore.isMember(guild.id, p.id!))
            .map(({ id }) => id);

        FluxDispatcher.dispatch({
            type: "GUILD_MEMBERS_REQUEST",
            guildIds: [guild.id],
            userIds: usersToRequest
        });
    }, []);

    const [selectedItemIndex, selectItem] = useState(0);
    const selectedItem = permissions[selectedItemIndex];

    const roles = GuildStore.getRoles(guild.id);

    return (
        <ModalRoot
            {...modalProps}
            size={ModalSize.LARGE}
        >
            <ModalHeader>
                <Text className={cl("modal-title")} variant="heading-lg/semibold">{header} permissions:</Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                {!selectedItem && (
                    <div className={cl("modal-no-perms")}>
                        <Text variant="heading-lg/normal">No permissions to display!</Text>
                    </div>
                )}

                {selectedItem && (
                    <div className={cl("modal-container")}>
                        <ScrollerThin className={cl("modal-list")} orientation="auto">
                            {permissions.map((permission, index) => {
                                const user: User | undefined = UserStore.getUser(permission.id ?? "");
                                const role: Role | undefined = roles[permission.id ?? ""];
                                const roleIconSrc = role != null ? getRoleIconSrc(role) : undefined;

                                return (
                                    <div
                                        className={cl("modal-list-item-btn")}
                                        onClick={() => selectItem(index)}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div
                                            className={cl("modal-list-item", { "modal-list-item-active": selectedItemIndex === index })}
                                            onContextMenu={e => {
                                                if (permission.type === PermissionType.Role)
                                                    ContextMenuApi.openContextMenu(e, () => (
                                                        <RoleContextMenu
                                                            guild={guild}
                                                            roleId={permission.id!}
                                                            onClose={modalProps.onClose}
                                                        />
                                                    ));
                                                else if (permission.type === PermissionType.User) {
                                                    ContextMenuApi.openContextMenu(e, () => (
                                                        <UserContextMenu
                                                            userId={permission.id!}
                                                        />
                                                    ));
                                                }
                                            }}
                                        >
                                            {(permission.type === PermissionType.Role || permission.type === PermissionType.Owner) && (
                                                <span
                                                    className={cl("modal-role-circle")}
                                                    style={{ backgroundColor: role?.colorString ?? "var(--primary-300)" }}
                                                />
                                            )}
                                            {permission.type === PermissionType.Role && roleIconSrc != null && (
                                                <img
                                                    className={cl("modal-role-image")}
                                                    src={roleIconSrc}
                                                />
                                            )}
                                            {permission.type === PermissionType.User && user != null && (
                                                <img
                                                    className={cl("modal-user-img")}
                                                    src={user.getAvatarURL(void 0, void 0, false)}
                                                />
                                            )}
                                            <Text variant="text-md/normal">
                                                {
                                                    permission.type === PermissionType.Role
                                                        ? role?.name ?? "Unknown Role"
                                                        : permission.type === PermissionType.User
                                                            ? (user != null && getUniqueUsername(user)) ?? "Unknown User"
                                                            : (
                                                                <Flex style={{ gap: "0.2em", justifyItems: "center" }}>
                                                                    @owner
                                                                    <OwnerCrownIcon height={18} width={18} aria-hidden="true" />
                                                                </Flex>
                                                            )
                                                }
                                            </Text>
                                        </div>
                                    </div>
                                );
                            })}
                        </ScrollerThin>
                        <div className={cl("modal-divider")} />
                        <ScrollerThin className={cl("modal-perms")} orientation="auto">
                            {Object.entries(PermissionsBits).map(([permissionName, bit]) => (
                                <div className={cl("modal-perms-item")}>
                                    <div className={cl("modal-perms-item-icon")}>
                                        {(() => {
                                            const { permissions, overwriteAllow, overwriteDeny } = selectedItem;

                                            if (permissions)
                                                return (permissions & bit) === bit
                                                    ? PermissionAllowedIcon()
                                                    : PermissionDeniedIcon();

                                            if (overwriteAllow && (overwriteAllow & bit) === bit)
                                                return PermissionAllowedIcon();
                                            if (overwriteDeny && (overwriteDeny & bit) === bit)
                                                return PermissionDeniedIcon();

                                            return PermissionDefaultIcon();
                                        })()}
                                    </div>
                                    <Text variant="text-md/normal">{getPermissionString(permissionName)}</Text>

                                    <Tooltip text={getPermissionDescription(permissionName) || "No Description"}>
                                        {props => <InfoIcon {...props} />}
                                    </Tooltip>
                                </div>
                            ))}
                        </ScrollerThin>
                    </div>
                )}
            </ModalContent>
        </ModalRoot>
    );
}

function RoleContextMenu({ guild, roleId, onClose }: { guild: Guild; roleId: string; onClose: () => void; }) {
    return (
        <Menu.Menu
            navId={cl("role-context-menu")}
            onClose={ContextMenuApi.closeContextMenu}
            aria-label="Role Options"
        >
            <Menu.MenuItem
                id={cl("copy-role-id")}
                label={i18n.Messages.COPY_ID_ROLE}
                action={() => {
                    Clipboard.copy(roleId);
                }}
            />

            {(settings.store as any).unsafeViewAsRole && (
                <Menu.MenuItem
                    id={cl("view-as-role")}
                    label={i18n.Messages.VIEW_AS_ROLE}
                    action={() => {
                        const role = GuildStore.getRole(guild.id, roleId);
                        if (!role) return;

                        onClose();
                        FluxDispatcher.dispatch({
                            type: "IMPERSONATE_UPDATE",
                            guildId: guild.id,
                            data: {
                                type: "ROLES",
                                roles: {
                                    [roleId]: role
                                }
                            }
                        });
                    }}
                />
            )}
        </Menu.Menu>
    );
}

function UserContextMenu({ userId }: { userId: string; }) {
    return (
        <Menu.Menu
            navId={cl("user-context-menu")}
            onClose={ContextMenuApi.closeContextMenu}
            aria-label="User Options"
        >
            <Menu.MenuItem
                id={cl("copy-user-id")}
                label={i18n.Messages.COPY_ID_USER}
                action={() => {
                    Clipboard.copy(userId);
                }}
            />
        </Menu.Menu>
    );
}

const RolesAndUsersPermissions = ErrorBoundary.wrap(RolesAndUsersPermissionsComponent);

export default function openRolesAndUsersPermissionsModal(permissions: Array<RoleOrUserPermission>, guild: Guild, header: string) {
    return openModal(modalProps => (
        <RolesAndUsersPermissions
            modalProps={modalProps}
            permissions={permissions}
            guild={guild}
            header={header}
        />
    ));
}
