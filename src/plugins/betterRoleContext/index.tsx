/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { ImageIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { getCurrentGuild, openImageModal } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ClipboardUtils, GuildStore, Menu, Permissions, PermissionStore } from "@webpack/common";

const GuildSettingsActionCreators = findByPropsLazy("open", "selectRole", "updateGuild");

const DeveloperMode = getUserSettingLazy("appearance", "developerMode")!;

const PencilIcon = () => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        role="img"
    >
        <path d="m13.96 5.46 4.58 4.58a1 1 0 0 0 1.42 0l1.38-1.38a2 2 0 0 0 0-2.82l-3.18-3.18a2 2 0 0 0-2.82 0l-1.38 1.38a1 1 0 0 0 0 1.42ZM2.11 20.16l.73-4.22a3 3 0 0 1 .83-1.61l7.87-7.87a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-7.87 7.87a3 3 0 0 1-1.6.83l-4.23.73a1.5 1.5 0 0 1-1.73-1.73Z" />
    </svg>
);

const AppearanceIcon = () => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M12 0C5.3733333 0 0 5.3733333 0 12c0 6.626667 5.3733333 12 12 12 1.106667 0 2-.893333 2-2 0-.52-.2-.986667-.52-1.346667-.306667-.346666-.506667-.813333-.506667-1.32 0-1.106666.893334-2 2-2h2.36c3.68 0 6.666667-2.986666 6.666667-6.666666C24 4.7733333 18.626667 0 12 0ZM4.6666667 12c-1.1066667 0-2-.893333-2-2 0-1.1066667.8933333-2 2-2 1.1066666 0 2 .8933333 2 2 0 1.106667-.8933334 2-2 2zM8.666667 6.6666667c-1.106667 0-2.0000003-.8933334-2.0000003-2 0-1.1066667.8933333-2 2.0000003-2 1.106666 0 2 .8933333 2 2 0 1.1066666-.893334 2-2 2zm6.666666 0c-1.106666 0-2-.8933334-2-2 0-1.1066667.893334-2 2-2 1.106667 0 2 .8933333 2 2 0 1.1066666-.893333 2-2 2zm4 5.3333333c-1.106666 0-2-.893333-2-2 0-1.1066667.893334-2 2-2 1.106667 0 2 .8933333 2 2 0 1.106667-.893333 2-2 2z" />
    </svg>
);

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
    description: "Adds options to copy role color / edit role / view role icon when right clicking roles in the user profile",
    authors: [Devs.Ven, Devs.goodbee],
    dependencies: ["SettingsStoreAPI"],

    settings,

    start() {
        // DeveloperMode needs to be enabled for the context menu to be shown
        DeveloperMode.updateSetting(true);
    },

    contextMenus: {
        "dev-context"(children, { id }: { id: string; }) {
            const guild = getCurrentGuild();
            if (!guild) return;

            const role = GuildStore.getRole(guild.id, id);
            if (!role) return;

            if (role.colorString) {
                children.push(
                    <Menu.MenuItem
                        id="vc-copy-role-color"
                        label="Copy Role Color"
                        action={() => { ClipboardUtils.copy(role.colorString!); }}
                        icon={AppearanceIcon}
                    />
                );
            }

            if (role.icon) {
                children.push(
                    <Menu.MenuItem
                        id="vc-view-role-icon"
                        label="View Role Icon"
                        action={() => {
                            openImageModal(`${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/role-icons/${role.id}/${role.icon}.${settings.store.roleIconFileFormat}`);
                        }}
                        icon={ImageIcon}
                    />

                );
            }

            if (PermissionStore.can(Permissions.MANAGE_ROLES, guild)) {
                children.push(
                    <Menu.MenuItem
                        id="vc-edit-role"
                        label="Edit Role"
                        action={async () => {
                            await GuildSettingsActionCreators.open(guild.id, "ROLES");
                            GuildSettingsActionCreators.selectRole(id);
                        }}
                        icon={PencilIcon}
                    />
                );
            }
        }
    }
});
