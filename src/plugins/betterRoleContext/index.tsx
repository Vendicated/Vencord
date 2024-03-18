/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { getCurrentGuild, getGuildRoles } from "@utils/discord";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Clipboard, Menu, PermissionStore, TextAndImagesSettingsStores } from "@webpack/common";

const GuildSettingsActions = findByPropsLazy("open", "selectRole", "updateGuild");

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

export default definePlugin({
    name: "BetterRoleContext",
    description: "Adds options to copy role color / edit role when right clicking roles in the user profile",
    authors: [Devs.Ven],

    start() {
        // DeveloperMode needs to be enabled for the context menu to be shown
        TextAndImagesSettingsStores.DeveloperMode.updateSetting(true);
    },

    contextMenus: {
        "dev-context"(children, { id }: { id: string; }) {
            const guild = getCurrentGuild();
            if (!guild) return;

            const role = getGuildRoles(guild.id)[id];
            if (!role) return;

            if (role.colorString) {
                children.push(
                    <Menu.MenuItem
                        id="vc-copy-role-color"
                        label="Copy Role Color"
                        action={() => Clipboard.copy(role.colorString!)}
                        icon={AppearanceIcon}
                    />
                );
            }

            if (PermissionStore.getGuildPermissionProps(guild).canManageRoles) {
                children.push(
                    <Menu.MenuItem
                        id="vc-edit-role"
                        label="Edit Role"
                        action={async () => {
                            await GuildSettingsActions.open(guild.id, "ROLES");
                            GuildSettingsActions.selectRole(id);
                        }}
                        icon={PencilIcon}
                    />
                );
            }
        }
    }
});
