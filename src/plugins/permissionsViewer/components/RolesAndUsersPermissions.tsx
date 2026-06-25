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
import { CopyIdIcon, InfoIcon, OwnerCrownIcon } from "@components/Icons";
import { buildExtraRoleContextMenuItems } from "@plugins/betterRoleContext";
import { cl, getGuildPermissionSpecMap, loadGetGuildPermissionSpecMap } from "@plugins/permissionsViewer/utils";
import { copyToClipboard } from "@utils/clipboard";
import { getIntlMessage, getUniqueUsername } from "@utils/discord";
import { Guild, RenderModalProps, Role, RoleOrUserPermission, UnicodeEmoji, User } from "@vencord/discord-types";
import { PermissionOverwriteType } from "@vencord/discord-types/enums";
import { findByCodeLazy } from "@webpack";
import { ContextMenuApi, FluxDispatcher, GuildMemberStore, GuildRoleStore, i18n, Menu, Modal, openModalLazy, PermissionsBits, ScrollerThin, Text, Tooltip, useEffect, useMemo, useRef, UserStore, useState, useStateFromStores } from "@webpack/common";

import { settings } from "..";
import { PermissionAllowedIcon, PermissionDeniedIcon } from "./icons";

type GetRoleIconData = (role: Role, size: number) => { customIconSrc?: string; unicodeEmoji?: UnicodeEmoji; };
const getRoleIconData: GetRoleIconData = findByCodeLazy("convertSurrogateToName", "customIconSrc", "unicodeEmoji");

type ModalScrollerRefTarget = HTMLDivElement | {
    getScrollerNode?(): HTMLDivElement | null;
};

function getModalScrollerNode(target: ModalScrollerRefTarget | null) {
    if (target instanceof Element)
        return target;

    return target?.getScrollerNode?.() ?? null;
}

function getRoleIconSrc(role: Role) {
    const icon = getRoleIconData(role, 20);
    if (!icon) return;

    const { customIconSrc, unicodeEmoji } = icon;
    return customIconSrc ?? unicodeEmoji?.url;
}

function RolesAndUsersPermissionsComponent({ permissions, guild, modalProps, header }: { permissions: Array<RoleOrUserPermission>; guild: Guild; modalProps: RenderModalProps; header: string; }) {
    const guildPermissionSpecMap = useMemo(() => getGuildPermissionSpecMap(guild), [guild.id]);
    const modalScrollerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedItemIndex, selectItem] = useState(0);
    const selectedItem = permissions[selectedItemIndex];
    const hasSelectedItem = selectedItem != null;

    useEffect(() => {
        const container = containerRef.current;
        const modalScroller = getModalScrollerNode(modalScrollerRef.current as ModalScrollerRefTarget | null);

        if (!container || !(modalScroller instanceof Element)) return;

        let frameId = 0;

        const syncContainerHeight = () => {
            const nextHeight = `${modalScroller.clientHeight}px`;
            if (container.style.height === nextHeight)
                return;

            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(() => {
                if (container.isConnected && container.style.height !== nextHeight)
                    container.style.height = nextHeight;
            });
        };

        syncContainerHeight();

        const resizeObserver = new ResizeObserver(syncContainerHeight);
        resizeObserver.observe(modalScroller);

        return () => {
            cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
        };
    }, [hasSelectedItem]);

    useStateFromStores(
        [GuildMemberStore],
        () => GuildMemberStore.getMemberIds(guild.id),
        null,
        (old, current) => old.length === current.length
    );

    useEffect(() => {
        permissions.sort((a, b) => a.type - b.type);
    }, [permissions]);

    useEffect(() => {
        const usersToRequest = permissions
            .filter(p => p.type === PermissionOverwriteType.MEMBER && !GuildMemberStore.isMember(guild.id, p.id!))
            .map(({ id }) => id);

        FluxDispatcher.dispatch({
            type: "GUILD_MEMBERS_REQUEST",
            guildIds: [guild.id],
            userIds: usersToRequest
        });
    }, []);

    const roles = GuildRoleStore.getRolesSnapshot(guild.id);

    return (
        <Modal
            {...modalProps}
            size="xl"
            title={`${header} Permissions`}
            scrollerRef={modalScrollerRef}
        >
            {!selectedItem && (
                <div className={cl("modal-no-perms")}>
                    <Text variant="heading-lg/normal">No permissions to display!</Text>
                </div>
            )}

            {selectedItem && (
                <div className={cl("modal-container")} ref={containerRef}>
                    <ScrollerThin className={cl("modal-list")} orientation="auto">
                        {permissions.map((permission, index) => {
                            const user: User | undefined = UserStore.getUser(permission.id ?? "");
                            const role: Role | undefined = roles[permission.id ?? ""];
                            const roleIconSrc = role != null ? getRoleIconSrc(role) : undefined;

                            return (
                                <div
                                    key={index}
                                    className={cl("modal-list-item-btn")}
                                    onClick={() => selectItem(index)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div
                                        className={cl("modal-list-item", { "modal-list-item-active": selectedItemIndex === index })}
                                        onContextMenu={e => {
                                            if (permission.type === PermissionOverwriteType.ROLE)
                                                ContextMenuApi.openContextMenu(e, () => (
                                                    <RoleContextMenu
                                                        guild={guild}
                                                        roleId={permission.id!}
                                                        onClose={modalProps.onClose}
                                                    />
                                                ));
                                            else if (permission.type === PermissionOverwriteType.MEMBER) {
                                                ContextMenuApi.openContextMenu(e, () => (
                                                    <UserContextMenu
                                                        userId={permission.id!}
                                                    />
                                                ));
                                            }
                                        }}
                                    >
                                        {(permission.type === PermissionOverwriteType.ROLE || permission.type === PermissionOverwriteType.OWNER) && (
                                            <span
                                                className={cl("modal-role-circle")}
                                                style={{ backgroundColor: role?.colorString ?? "var(--primary-300)" }}
                                            />
                                        )}
                                        {permission.type === PermissionOverwriteType.ROLE && roleIconSrc != null && (
                                            <img
                                                className={cl("modal-role-image")}
                                                src={roleIconSrc}
                                            />
                                        )}
                                        {permission.type === PermissionOverwriteType.MEMBER && user != null && (
                                            <img
                                                className={cl("modal-user-img")}
                                                src={user.getAvatarURL(void 0, void 0, false)}
                                            />
                                        )}
                                        <Text variant="text-md/normal" className={cl("modal-list-item-text")}>
                                            {
                                                permission.type === PermissionOverwriteType.ROLE
                                                    ? role?.name ?? "Unknown Role"
                                                    : permission.type === PermissionOverwriteType.MEMBER
                                                        ? (user != null && getUniqueUsername(user)) ?? "Unknown User"
                                                        : (
                                                            <Flex gap="0.2em">
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
                        {Object.values(PermissionsBits).map(bit => {
                            const overrideType = (() => {
                                const { permissions, overwriteAllow, overwriteDeny } = selectedItem;

                                if (permissions != null)
                                    return (permissions & bit) === bit
                                        ? "allowed"
                                        : "denied";

                                if (overwriteAllow && (overwriteAllow & bit) === bit)
                                    return "allowed";
                                if (overwriteDeny && (overwriteDeny & bit) === bit)
                                    return "denied";

                                return "default";
                            })();

                            if (overrideType === "default") return null;

                            return (
                                <div key={bit} className={cl("modal-perms-item")}>
                                    <div className={cl("modal-perms-item-icon")}>
                                        {overrideType === "allowed" && <PermissionAllowedIcon />}
                                        {overrideType === "denied" && <PermissionDeniedIcon />}
                                    </div>
                                    <Text variant="text-md/normal">{guildPermissionSpecMap[String(bit)].title}</Text>

                                    <Tooltip text={
                                        (() => {
                                            const { description } = guildPermissionSpecMap[String(bit)];
                                            return typeof description === "function" ? i18n.intl.format(description, {}) : description;
                                        })()
                                    }>
                                        {props => <InfoIcon {...props} />}
                                    </Tooltip>
                                </div>
                            );
                        })}
                    </ScrollerThin>
                </div>
            )}
        </Modal>
    );
}

function ViewAsRoleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M20.7 12.7a1 1 0 0 0 0-1.4l-5-5a1 1 0 1 0-1.4 1.4l3.29 3.3H4a1 1 0 1 0 0 2h13.59l-3.3 3.3a1 1 0 0 0 1.42 1.4l5-5Z" />
        </svg>
    );
}

function RoleContextMenu({ guild, roleId, onClose }: { guild: Guild; roleId: string; onClose: () => void; }) {
    const popoutRef = useRef(null);
    const role = GuildRoleStore.getRole(guild.id, roleId);
    const { before, after } = buildExtraRoleContextMenuItems(role, guild, popoutRef);

    return (
        <Menu.Menu
            navId={cl("role-context-menu")}
            onClose={ContextMenuApi.closeContextMenu}
            aria-label="Role Options"
        >
            {before}

            <Menu.MenuItem
                id={cl("copy-role-id")}
                label={getIntlMessage("COPY_ID_ROLE")}
                icon={CopyIdIcon}
                action={() => copyToClipboard(roleId)}
            />

            {after}

            {(settings.store as any).unsafeViewAsRole && (
                <Menu.MenuItem
                    id={cl("view-as-role")}
                    label={getIntlMessage("VIEW_AS_ROLE")}
                    icon={ViewAsRoleIcon}
                    action={() => {
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
                label={getIntlMessage("COPY_ID_USER")}
                action={() => {
                    copyToClipboard(userId);
                }}
            />
        </Menu.Menu>
    );
}

const RolesAndUsersPermissions = ErrorBoundary.wrap(RolesAndUsersPermissionsComponent);

export default function openRolesAndUsersPermissionsModal(permissions: Array<RoleOrUserPermission>, guild: Guild, header: string) {
    return openModalLazy(async () => {
        await loadGetGuildPermissionSpecMap();

        return modalProps => (
            <RolesAndUsersPermissions
                modalProps={modalProps}
                permissions={permissions}
                guild={guild}
                header={header}
            />
        );
    });
}
