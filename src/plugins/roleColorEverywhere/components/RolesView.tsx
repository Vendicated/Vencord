/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { filters, findBulk, proxyLazyWebpack } from "@webpack";
import { Text } from "@webpack/common";
import { Role } from "discord-types/general";

const Classes = proxyLazyWebpack(() =>
    Object.assign({}, ...findBulk(
        filters.byProps("roles", "rolePill", "rolePillBorder"),
        filters.byProps("roleCircle", "dotBorderBase", "dotBorderColor"),
        filters.byProps("roleNameOverflow", "root", "roleName", "roleRemoveButton", "roleRemoveButtonCanRemove", "roleRemoveIcon", "roleIcon")
    ))
) as Record<"roles" | "rolePill" | "rolePillBorder" | "desaturateUserColors" | "flex" | "alignCenter" | "justifyCenter" | "svg" | "background" | "dot" | "dotBorderColor" | "roleCircle" | "dotBorderBase" | "flex" | "alignCenter" | "justifyCenter" | "wrap" | "root" | "role" | "roleRemoveButton" | "roleDot" | "roleFlowerStar" | "roleRemoveIcon" | "roleRemoveIconFocused" | "roleVerifiedIcon" | "roleName" | "roleNameOverflow" | "actionButton" | "overflowButton" | "addButton" | "addButtonIcon" | "overflowRolesPopout" | "overflowRolesPopoutArrowWrapper" | "overflowRolesPopoutArrow" | "popoutBottom" | "popoutTop" | "overflowRolesPopoutHeader" | "overflowRolesPopoutHeaderIcon" | "overflowRolesPopoutHeaderText" | "roleIcon" | "roleRemoveButtonCanRemove" | "roleRemoveIcon" | "roleIcon", string>;

export function RoleCard({ onRoleRemove, data, border }: { onRoleRemove: (id: string) => void, data: Role, border: boolean }) {
    const { role, roleRemoveButton, roleRemoveButtonCanRemove, roleRemoveIcon, roleIcon, roleNameOverflow, rolePill, rolePillBorder, roleCircle, roleName } = Classes;

    return (
        <div className={classes(role, rolePill, border ? rolePillBorder : null)}>
            <div
                className={classes(roleRemoveButton, roleRemoveButtonCanRemove)}
                onClick={() => onRoleRemove(data.id)}
            >
                <span
                    className={roleCircle}
                    style={{ backgroundColor: data.colorString }}
                />
                <svg
                    role="img"
                    className={roleRemoveIcon}
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                >
                    <path fill="var(--primary-630)" d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z"/>
                </svg>
            </div>
            <span>
                <img alt="" className={roleIcon} height="16" src={`https://cdn.discordapp.com/role-icons/${data.id}/${data.icon}.webp?size=16&quality=lossless`}/>
            </span>
            <div className={roleName}>
                <Text
                    className={roleNameOverflow}
                    variant="text-xs/medium"
                >
                    {data.name}
                </Text>
            </div>
        </div>
    );
}

export function RoleList({ roleData, onRoleRemove }: { onRoleRemove: (id: string) => void, roleData: Role[] }) {
    const { root, roles } = Classes;

    return (
        <div>
            {!roleData?.length && (
                <span>No roles</span>
            )}

            {roleData?.length !== 0 && (
                <div className={classes(root, roles)}>
                    {roleData.map(data => (
                        <RoleCard
                            data={data}
                            onRoleRemove={onRoleRemove}
                            border={false}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function RoleModalList({ roleList, header, onRoleRemove, modalProps }: {
    roleList: Role[]
    modalProps: ModalProps
    header: string
    onRoleRemove: (id: string) => void
}) {
    return (
        <ModalRoot
            {...modalProps}
            size={ModalSize.SMALL}
        >
            <ModalHeader>
                <Text className="vc-role-list-title" variant="heading-lg/semibold">{header}</Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <RoleList
                    roleData={roleList}
                    onRoleRemove={onRoleRemove}
                />
            </ModalContent>
        </ModalRoot >
    );
}
