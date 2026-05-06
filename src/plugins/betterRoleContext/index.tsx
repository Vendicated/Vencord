/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { ImageIcon } from "@components/Icons";
import { copyToClipboard } from "@utils/clipboard";
import { Devs } from "@utils/constants";
import { getCurrentChannel, getCurrentGuild, openImageModal } from "@utils/discord";
import { isTruthy } from "@utils/guards";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Guild, PopoutProps, Role } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy, findCssClassesLazy } from "@webpack";
import { GuildRoleStore, Menu, PermissionStore, Popout, useRef } from "@webpack/common";
import { ComponentType } from "react";

const GuildSettingsActions = findByPropsLazy("open", "selectRole", "updateGuild");
const MenuItemClasses = findCssClassesLazy("item", "labelContainer", "colorDefault", "label", "iconContainer");
const loadRoleMembers = findByCodeLazy(".GUILD_ROLE_MEMBER_IDS(", "requestMembersById");

const DeveloperMode = getUserSettingLazy("appearance", "developerMode")!;

function PencilIcon() {
    return (
        <svg
            role="img"
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
        >
            <path fill="currentColor" d="m13.96 5.46 4.58 4.58a1 1 0 0 0 1.42 0l1.38-1.38a2 2 0 0 0 0-2.82l-3.18-3.18a2 2 0 0 0-2.82 0l-1.38 1.38a1 1 0 0 0 0 1.42ZM2.11 20.16l.73-4.22a3 3 0 0 1 .83-1.61l7.87-7.87a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-7.87 7.87a3 3 0 0 1-1.6.83l-4.23.73a1.5 1.5 0 0 1-1.73-1.73Z" />
        </svg>
    );
}

function AppearanceIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M 12,0 C 5.3733333,0 0,5.3733333 0,12 c 0,6.626667 5.3733333,12 12,12 1.106667,0 2,-0.893333 2,-2 0,-0.52 -0.2,-0.986667 -0.52,-1.346667 -0.306667,-0.346666 -0.506667,-0.813333 -0.506667,-1.32 0,-1.106666 0.893334,-2 2,-2 h 2.36 C 21.013333,17.333333 24,14.346667 24,10.666667 24,4.7733333 18.626667,0 12,0 Z M 4.6666667,12 c -1.1066667,0 -2,-0.893333 -2,-2 0,-1.1066667 0.8933333,-2 2,-2 1.1066666,0 2,0.8933333 2,2 0,1.106667 -0.8933334,2 -2,2 z M 8.666667,6.6666667 c -1.106667,0 -2.0000003,-0.8933334 -2.0000003,-2 0,-1.1066667 0.8933333,-2 2.0000003,-2 1.106666,0 2,0.8933333 2,2 0,1.1066666 -0.893334,2 -2,2 z m 6.666666,0 c -1.106666,0 -2,-0.8933334 -2,-2 0,-1.1066667 0.893334,-2 2,-2 1.106667,0 2,0.8933333 2,2 0,1.1066666 -0.893333,2 -2,2 z m 4,5.3333333 c -1.106666,0 -2,-0.893333 -2,-2 0,-1.1066667 0.893334,-2 2,-2 1.106667,0 2,0.8933333 2,2 0,1.106667 -0.893333,2 -2,2 z" />
        </svg>
    );
}

function RoleMembersIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM11.53 11A9.53 9.53 0 0 0 2 20.53c0 .81.66 1.47 1.47 1.47h.22c.24 0 .44-.17.5-.4.29-1.12.84-2.17 1.32-2.91.14-.21.43-.1.4.15l-.26 2.61c-.02.3.2.55.5.55h11.7a.5.5 0 0 0 .5-.55l-.27-2.6c-.02-.26.27-.37.41-.16.48.74 1.03 1.8 1.32 2.9.06.24.26.41.5.41h.22c.81 0 1.47-.66 1.47-1.47A9.53 9.53 0 0 0 12.47 11h-.94Z" />
        </svg>
    );
}

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

interface RoleMemberPopoutProps {
    popoutProps: PopoutProps;
    guildId: string;
    channelId: string;
    roleId: string;
}
type RoleMemberPopout = ComponentType<RoleMemberPopoutProps>;

let RoleMemberPopout: RoleMemberPopout = () => null;

export function buildExtraRoleContextMenuItems(role: Role, guild: Guild, popoutRef?: React.RefObject<any>) {
    if (!role) return { before: [], after: [] };

    const before = [
        PermissionStore.getGuildPermissionProps(guild).canManageRoles && (
            <Menu.MenuItem
                key="vc-edit-role"
                id="vc-edit-role"
                label="Edit Role"
                action={async () => {
                    await GuildSettingsActions.open(guild.id, "ROLES");
                    GuildSettingsActions.selectRole(role.id);
                }}
                icon={PencilIcon}
            />
        ),
        role.colorString && (
            <Menu.MenuItem
                key="vc-copy-role-color"
                id="vc-copy-role-color"
                label="Copy Role Color"
                action={() => copyToClipboard(role.colorString!)}
                icon={AppearanceIcon}
            />
        )
    ].filter(isTruthy);

    const after = [
        role.icon && (
            <Menu.MenuItem
                key="vc-view-role-icon"
                id="vc-view-role-icon"
                label="View Role Icon"
                action={() => {
                    openImageModal({
                        url: `${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/role-icons/${role.id}/${role.icon}.${settings.store.roleIconFileFormat}`,
                        height: 128,
                        width: 128
                    });
                }}
                icon={ImageIcon}
            />
        ),
        popoutRef && (
            <Menu.MenuItem
                key="vc-view-role-members"
                id="vc-view-role-members"
                label="View Role Members"
                render={() => (
                    <Popout
                        position="right"
                        align="center"
                        targetElementRef={popoutRef}
                        preload={() => loadRoleMembers(guild.id, role.id)}
                        renderPopout={popoutProps => (
                            <RoleMemberPopout
                                popoutProps={popoutProps}
                                guildId={guild.id}
                                channelId={getCurrentChannel()!.id}
                                roleId={role.id}
                            />
                        )}
                    >
                        {popoutProps => (
                            <div
                                className={classes(MenuItemClasses.item, MenuItemClasses.labelContainer, MenuItemClasses.colorDefault)}
                                ref={popoutRef}
                                role="menuitem"
                                {...popoutProps}
                            >
                                <div className={MenuItemClasses.label}>View Role Members</div>
                                <div className={MenuItemClasses.iconContainer}>
                                    <RoleMembersIcon />
                                </div>
                            </div>
                        )}
                    </Popout>
                )}
            />
        )
    ].filter(isTruthy);

    return { before, after };
}

export default definePlugin({
    name: "BetterRoleContext",
    description: "Adds options to copy role color / edit role / view role icon when right clicking roles in the user profile",
    tags: ["Roles", "Appearance"],
    authors: [Devs.Ven, Devs.goodbee],
    dependencies: ["UserSettingsAPI"],

    settings,

    patches: [{
        find: ".ROLE_MENTION)",
        replacement: {
            match: /function (\i)(?=.+?renderPopout:.{0,20}\1,\{guildId:\i,channelId:\i)/,
            replace: "$self.RoleMembers=$1;$&"
        }
    }],

    start() {
        // DeveloperMode needs to be enabled for the context menu to be shown
        DeveloperMode.updateSetting(true);
    },

    set RoleMembers(component: RoleMemberPopout) {
        RoleMemberPopout = component;
    },

    contextMenus: {
        "dev-context"(children, { id }: { id: string; }) {
            const popoutRef = useRef(null);

            const guild = getCurrentGuild();
            if (!guild) return;

            const role = GuildRoleStore.getRole(guild.id, id);
            if (!role) return;

            const { before, after } = buildExtraRoleContextMenuItems(role, guild, popoutRef);
            children.unshift(...before);
            children.push(...after);
        }
    }
});
