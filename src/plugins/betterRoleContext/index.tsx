/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { ImageIcon, PencilIcon } from "@components/Icons";
import { copyToClipboard } from "@utils/clipboard";
import { Devs } from "@utils/constants";
import { getCurrentGuild } from "@utils/discord";
import { ModalAPI } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import type { Guild, Role } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { GuildRoleStore, Menu, PermissionStore } from "@webpack/common";
import type { ReactElement } from "react";

const GuildSettingsActions = findByPropsLazy("open", "selectRole", "updateGuild");

const DeveloperMode = getUserSettingLazy("appearance", "developerMode");

function NameIcon() {
    return (
        <svg
            role="img"
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
        >
            <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
        </svg>
    );
}

function AppearanceIcon() {
    return (
        <svg
            role="img"
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
        >
            <path fill="currentColor" d="M 12,0 C 5.3733333,0 0,5.3733333 0,12 c 0,6.626667 5.3733333,12 12,12 1.106667,0 2,-0.893333 2,-2 0,-0.52 -0.2,-0.986667 -0.52,-1.346667 -0.306667,-0.346666 -0.506667,-0.813333 -0.506667,-1.32 0,-1.106666 0.893334,-2 2,-2 h 2.36 C 21.013333,17.333333 24,14.346667 24,10.666667 24,4.7733333 18.626667,0 12,0 Z M 4.6666667,12 c -1.1066667,0 -2,-0.893333 -2,-2 0,-1.1066667 0.8933333,-2 2,-2 1.1066666,0 2,0.8933333 2,2 0,1.106667 -0.8933334,2 -2,2 z M 8.666667,6.6666667 c -1.106667,0 -2.0000003,-0.8933334 -2.0000003,-2 0,-1.1066667 0.8933333,-2 2.0000003,-2 1.106666,0 2,0.8933333 2,2 0,1.1066666 -0.893334,2 -2,2 z m 6.666666,0 c -1.106666,0 -2,-0.8933334 -2,-2 0,-1.1066667 0.893334,-2 2,-2 1.106667,0 2,0.8933333 2,2 0,1.1066666 -0.893333,2 -2,2 z m 4,5.3333333 c -1.106666,0 -2,-0.893333 -2,-2 0,-1.1066667 0.893334,-2 2,-2 1.106667,0 2,0.8933333 2,2 0,1.106667 -0.893333,2 -2,2 z" />
        </svg>
    );
}

const copyableRoleProperties = [
    {
        key: "colorString",
        id: "vc-copy-role-color",
        name: "Copy Role Color",
        icon: AppearanceIcon,
        value: (role: Role) => (!role.colorStrings.primaryColor || !role.colorStrings.secondaryColor) && role.colorString,
    },
    {
        key: "colorString",
        id: "vc-copy-role-color",
        name: "Copy Role Gradient Color",
        icon: AppearanceIcon,
        value: (role: Role) => role.colorStrings.primaryColor && role.colorStrings.secondaryColor && `${role.colorStrings.primaryColor} ${role.colorStrings.secondaryColor}`,
    },
    {
        key: "name",
        id: "vc-copy-role-name",
        name: "Copy Role Name",
        icon: NameIcon,
        value: (role: Role) => role.name,
    },
    {
        id: "vc-copy-role-icon-url",
        name: "Copy Role Icon URL",
        icon: ImageIcon,
        value: (role: Role) => role.icon && `${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/role-icons/${role.id}/${role.icon}.${settings.store.roleIconFileFormat}`,
    },
];

export const patchRoleContextMenu = (
    children: (ReactElement<any> | null)[],
    role: Role,
    editRoleGuildId?: string
) => {
    const contextItems = copyableRoleProperties.reduce((acc, propertyInfo) => {
        const propertyValue = propertyInfo.value(role);

        if (propertyValue)
            acc.push(
                <Menu.MenuItem
                    id={propertyInfo.id}
                    label={propertyInfo.name}
                    icon={propertyInfo.icon}
                    action={() => copyToClipboard(propertyValue)}
                />
            );

        return acc;
    }, [] as React.ReactElement[]);

    if (editRoleGuildId) {
        contextItems.push(
            <Menu.MenuItem
                id="vc-edit-role"
                label="Edit Role"
                icon={() => PencilIcon({ width: 18, height: 18 })}
                action={async () => {
                    ModalAPI.closeModal("vc-permviewer-modal");

                    await GuildSettingsActions.open(editRoleGuildId, "ROLES");
                    GuildSettingsActions.selectRole(role.id);
                }}
            />
        );
    }

    const viewRawItemIndex = children.findIndex(child => {
        const props = child?.props;

        return !Array.isArray(props) && props?.id === "vc-view-role-raw";
    });

    if (viewRawItemIndex !== -1) {
        contextItems.push(children.splice(viewRawItemIndex, 1)[0]!);
    }

    const copyRoleIdIndex = children.findIndex(child => child?.key?.includes("devmode-copy-id-"));

    children.splice(copyRoleIdIndex !== -1 ? copyRoleIdIndex + 1 : -1, 0, ...contextItems);
};

const settings = definePluginSettings({
    roleIconFileFormat: {
        type: OptionType.SELECT,
        description: "File format to use when viewing role icons",
        options: [
            {
                label: "png",
                value: "png",
                default: true
            },
            {
                label: "webp",
                value: "webp",
            },
            {
                label: "jpg",
                value: "jpg"
            }
        ]
    }
});

export default definePlugin({
    name: "BetterRoleContext",
    description: "Adds options to copy role color / name / icon / edit role when right clicking roles in the user profile / guild roles list / permissions viewer",
    authors: [Devs.Ven, Devs.goodbee],
    dependencies: ["UserSettingsAPI"],

    settings,

    start() {
        // DeveloperMode needs to be enabled for the context menu to be shown
        DeveloperMode?.updateSetting(true);
    },

    contextMenus: {
        "vc-permviewer-role-context-menu"(children, { guild, role }: { guild: Guild, role?: Role; }) {
            if (!role) return;

            patchRoleContextMenu(children, role, PermissionStore.getGuildPermissionProps(guild).canManageRoles && guild.id);
        },
        "guild-settings-role-context"(children, { role }: { role: Role; }) {
            patchRoleContextMenu(children, role);
        },
        "dev-context"(children, { id }: { id: string; }) {
            const guild = getCurrentGuild();
            if (!guild) return;

            const role = GuildRoleStore.getRole(guild.id, id);
            if (!role) return;

            patchRoleContextMenu(children, role, PermissionStore.getGuildPermissionProps(guild).canManageRoles && guild.id);
        }
    }
});
