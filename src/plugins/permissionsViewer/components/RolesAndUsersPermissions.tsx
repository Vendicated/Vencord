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
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findLazy } from "@webpack";
import { ContextMenu, FluxDispatcher, Menu, Text, UserStore, useState } from "@webpack/common";
import { Guild, User } from "discord-types/general";

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

const Permissions: Record<string, bigint> = findLazy(m => typeof m.ADMINISTRATOR === "bigint");

async function openRolesAndUsersPermissionsModal(permissions: Array<RoleOrUserPermission>, guild: Guild, header: string) {
    const usersChunks: Array<Array<string>> = [];

    for (const permission of permissions) {
        if (permission.type === PermissionType.User) {
            if (!UserStore.getUser(permission.id)) {
                const currentChunk = usersChunks[usersChunks.length - 1] ?? [];
                if (currentChunk.length < 100) {
                    currentChunk.push(permission.id);

                    if (usersChunks.length) usersChunks[usersChunks.length - 1] = currentChunk;
                    else usersChunks.push(currentChunk);
                }
                else usersChunks.push([permission.id]);
            }
        }
    }

    let awaitAllChunks: Promise<void> | undefined = undefined;

    if (usersChunks.length > 0) {
        const allUsers = usersChunks.flat();

        awaitAllChunks = new Promise<void>((res, rej) => {
            let chunksReceived = 0;

            const timeout = setTimeout(rej, 15 * 1000);

            FluxDispatcher.subscribe("GUILD_MEMBERS_CHUNK", ({ guildId, members }: { guildId: string; members: Array<{ user: User; }>; }) => {
                if (guildId === guild.id && members.some(member => allUsers.includes(member.user.id))) {
                    chunksReceived += 1;
                }

                if (chunksReceived === usersChunks.length) {
                    res();
                    clearTimeout(timeout);
                }
            });
        });

        FluxDispatcher.dispatch({
            type: "GUILD_MEMBERS_REQUEST",
            guildIds: [guild.id],
            userIds: allUsers
        });
    }

    try {
        if (awaitAllChunks) await awaitAllChunks;

        openModal(modalProps => <RolesAndUsersPermissions permissions={permissions} guild={guild} modalProps={modalProps} header={header} />);
    } catch (err) {

    }
}

function RolesAndUsersPermissionsComponent({ permissions, guild, modalProps, header }: { permissions: Array<RoleOrUserPermission>; guild: Guild; modalProps: ModalProps; header: string; }) {
    permissions.sort(({ type: a }, { type: b }) => a - b);

    const [selectedItem, selectItem] = useState<string | null>(permissions[0]?.id ?? null);

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
                {selectedItem === null && (
                    <div className="permviewer-perms-no-perms">
                        <Text variant="heading-lg/normal">No permissions to display!</Text>
                    </div>
                )}

                {selectedItem !== null && (
                    <div className="permviewer-perms-container">
                        <div className="permviewer-perms-list">
                            {permissions.map(permission => (
                                <div
                                    className={["permviewer-perms-list-item", selectedItem === permission.id ? "permviewer-perms-list-item-active" : ""].filter(Boolean).join(" ")}
                                    onClick={() => selectItem(permission.id)}
                                    onContextMenu={e => permission.type === PermissionType.Role && ContextMenu.open(e, () => <RoleContextMenu guild={guild} roleId={permission.id} onClose={modalProps.onClose} />)}
                                >
                                    {permission.type === PermissionType.Role && (
                                        <span className="permviewer-perms-role-circle" style={{ backgroundColor: guild.roles[permission.id].colorString ?? "var(--primary-dark-300)" }} />
                                    )}
                                    {permission.type === PermissionType.User && (
                                        <img className="permviewer-perms-user-img" src={UserStore.getUser(permission.id).getAvatarURL(undefined, undefined, false)} />
                                    )}
                                    <Text variant="text-md/normal">{permission.type === PermissionType.Role ? guild.roles[permission.id].name : UserStore.getUser(permission.id).tag}</Text>
                                </div>
                            ))}
                        </div>
                        <div className="permviewer-perms-perms">
                            {Object.entries(Permissions).map(([permissionName, bit]) => (
                                <div className="permviewer-perms-perms-item">
                                    <div className="permviewer-perms-perms-item-icon">
                                        {((permissionsData: RoleOrUserPermission) => {
                                            const { permissions, overwriteAllow, overwriteDeny } = permissionsData;

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

                                        })(permissions.find(permission => permission.id === selectedItem)!)}
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
                    onClose();

                    FluxDispatcher.dispatch({ type: "IMPERSONATE_UPDATE", guildId: guild.id, data: { type: "ROLES", roles: { [roleId]: guild.roles[roleId] } } });
                }}
            />
        </Menu.ContextMenu>
    );
}

const RolesAndUsersPermissions = ErrorBoundary.wrap(RolesAndUsersPermissionsComponent);

export default openRolesAndUsersPermissionsModal;
