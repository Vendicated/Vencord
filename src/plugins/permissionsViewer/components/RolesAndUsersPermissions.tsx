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
import { requestMissingGuildMembers } from "@utils/guild";
import { useForceUpdater } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { ContextMenu, FluxDispatcher, Menu, PermissionsBits, Text, useEffect, UserStore, useState } from "@webpack/common";
import { Guild } from "discord-types/general";

import { getPermissionString } from "../formatting";

export enum PermissionType {
    Role = 0,
    User = 1
}

export interface RoleOrUserPermission {
    type: PermissionType;
    id: string;
    permissions?: bigint;
    overwriteAllow?: bigint;
    overwriteDeny?: bigint;
}

function openRolesAndUsersPermissionsModal(permissions: Array<RoleOrUserPermission>, guild: Guild, header: string) {
    return openModal(modalProps => <RolesAndUsersPermissions permissions={permissions} guild={guild} modalProps={modalProps} header={header} />);
}

function RolesAndUsersPermissionsComponent({ permissions, guild, modalProps, header }: { permissions: Array<RoleOrUserPermission>; guild: Guild; modalProps: ModalProps; header: string; }) {
    permissions.sort(({ type: a }, { type: b }) => a - b);

    const forceUpdate = useForceUpdater();
    let requestSucess: boolean | undefined = undefined;

    useEffect(() => {
        requestMissingGuildMembers(permissions.filter(permission => permission.type === PermissionType.User).map(({ id }) => id), guild.id)
            .then(sucess => {
                requestSucess = sucess;
                forceUpdate();
            });
    }, []);

    const [selectedItemIndex, selectItem] = useState<number>(0);
    const selectedItem = permissions[selectedItemIndex];

    return (
        <ModalRoot
            {...modalProps}
            size={ModalSize.MEDIUM}
        >
            <ModalHeader>
                <Text className="permviewer-perms-title" variant="heading-lg/semibold">{header} permissions:</Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                {selectedItem === undefined && (
                    <div className="permviewer-perms-no-perms">
                        <Text variant="heading-lg/normal">No permissions to display!</Text>
                    </div>
                )}

                {selectedItem !== undefined && (
                    <div className="permviewer-perms-container">
                        <div className="permviewer-perms-list">
                            {permissions.map((permission, index) => {
                                const user = UserStore.getUser(permission.id);
                                const role = guild.roles[permission.id];

                                return (
                                    <div
                                        className={["permviewer-perms-list-item", selectedItemIndex === index ? "permviewer-perms-list-item-active" : ""].filter(Boolean).join(" ")}
                                        onClick={() => selectItem(index)}
                                        onContextMenu={e => permission.type === PermissionType.Role && ContextMenu.open(e, () => <RoleContextMenu guild={guild} roleId={permission.id} onClose={modalProps.onClose} />)}
                                    >
                                        {permission.type === PermissionType.Role && (
                                            <span className="permviewer-perms-role-circle" style={{ backgroundColor: role?.colorString ?? "var(--primary-300)" }} />
                                        )}
                                        {permission.type === PermissionType.User && user !== undefined && (
                                            <img className="permviewer-perms-user-img" src={user.getAvatarURL(undefined, undefined, false)} />
                                        )}
                                        <Text variant="text-md/normal">{
                                            permission.type === PermissionType.Role
                                                ? role?.name ?? "Unknown Role"
                                                : (user?.tag) == null
                                                    ? requestSucess === undefined ? "Loading User..." : "Unknown User"
                                                    : user.tag
                                        }</Text>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="permviewer-perms-perms">
                            {Object.entries(PermissionsBits).map(([permissionName, bit]) => (
                                <div className="permviewer-perms-perms-item">
                                    <div className="permviewer-perms-perms-item-icon">
                                        {(() => {
                                            const { permissions, overwriteAllow, overwriteDeny } = selectedItem;

                                            let permissionState: boolean | null;

                                            outer: {
                                                if (permissions !== undefined) {
                                                    if ((permissions & bit) > 0n) permissionState = true;
                                                    else permissionState = false;
                                                } else {
                                                    if (overwriteAllow !== undefined) {
                                                        if ((overwriteAllow & bit) > 0n) {
                                                            permissionState = true;
                                                            break outer;
                                                        }
                                                    }
                                                    if (overwriteDeny !== undefined) {
                                                        if ((overwriteDeny & bit) > 0n) {
                                                            permissionState = false;
                                                            break outer;
                                                        }
                                                    }
                                                    permissionState = null;
                                                }
                                            }

                                            switch (permissionState) {
                                                case false: {
                                                    return (
                                                        <svg
                                                            height="24"
                                                            width="24"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path fill="var(--status-danger)" d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z" />
                                                        </svg>
                                                    );
                                                }
                                                case null: {
                                                    return (
                                                        <svg
                                                            height="24"
                                                            width="24"
                                                            viewBox="0 0 16 16"
                                                        >
                                                            <g>
                                                                <polygon fill="var(--text-normal)" points="12 2.32 10.513 2 4 13.68 5.487 14" />
                                                            </g>
                                                        </svg>
                                                    );
                                                }
                                                case true: {
                                                    return (
                                                        <svg
                                                            height="24"
                                                            width="24"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path fill="var(--text-positive)" d="M8.99991 16.17L4.82991 12L3.40991 13.41L8.99991 19L20.9999 7.00003L19.5899 5.59003L8.99991 16.17ZZ" />
                                                        </svg>
                                                    );
                                                }
                                                default: {
                                                    return null;
                                                }
                                            }

                                        })()}
                                    </div>
                                    <Text variant="text-md/normal">{getPermissionString(permissionName)}</Text>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </ModalContent>
        </ModalRoot>
    );
}

function RoleContextMenu({ guild, roleId, onClose }: { guild: Guild; roleId: string; onClose: () => void; }) {
    return (
        <Menu.ContextMenu
            navId="permviewer-role-context-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Role Options"
        >
            <Menu.MenuItem
                key="view-as-role"
                id="view-as-role"
                label="View As Role"
                action={() => {
                    if (!guild.roles[roleId]) return;

                    onClose();

                    FluxDispatcher.dispatch({ type: "IMPERSONATE_UPDATE", guildId: guild.id, data: { type: "ROLES", roles: { [roleId]: guild.roles[roleId] } } });
                }}
            />
        </Menu.ContextMenu>
    );
}

const RolesAndUsersPermissions = ErrorBoundary.wrap(RolesAndUsersPermissionsComponent);

export default openRolesAndUsersPermissionsModal;
