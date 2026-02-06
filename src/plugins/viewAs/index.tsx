/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { getUserSettingLazy } from "@api/UserSettings";
import { OpenExternalIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { getCurrentGuild } from "@utils/discord";
import definePlugin from "@utils/types";
import { User } from "@vencord/discord-types";
import { findByProps, findByPropsLazy } from "@webpack";
import { GuildRoleStore, Menu } from "@webpack/common";

const GuildSettingsActions = findByPropsLazy("open", "selectRole", "updateGuild");

const userContextPatch: NavContextMenuPatchCallback = (children, { user, latencyHistory }: { user?: User, onClose(): void; latencyHistory: Record<string, number[]>; }) => {
    if (!user) return;
    children.push(
        <Menu.MenuItem
            label="View As"
            id="vc-va-view-as"
            icon={OpenExternalIcon}
            action={() => viewAs(user.id)}
        />
    );
};

const viewAs = (userId: string) => {
    findByProps("_dispatch").addInterceptor(e => {
        if (e.type === "CURRENT_USER_UPDATE" || e.type === "CONNECTION_OPEN") {
            const currentUser = findByProps("getCurrentUser").getCurrentUser();
            e.user = Object.assign(findByProps("getUserStoreVersion").getUser(userId), currentUser);
        }
    });
    findByProps("_dispatch").dispatch({ type: "CURRENT_USER_UPDATE" });
};
const DeveloperMode = getUserSettingLazy("appearance", "developerMode")!;

export default definePlugin({
    name: "ViewAs",
    description: "Let you view the app as another user, or as role (without mod perms).",
    authors: [Devs.Fox3000foxy],
    dependencies: ["UserSettingsAPI"],

    start() {
        // DeveloperMode needs to be enabled for the context menu to be shown
        DeveloperMode.updateSetting(true);
    },


    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
        "user-profile-overflow-menu": userContextPatch,
        "dev-context"(children, { id }: { id: string; }) {
            const guild = getCurrentGuild();
            if (!guild) return;

            const role = GuildRoleStore.getRole(guild.id, id);
            if (!role) return;


            children.unshift(
                <Menu.MenuItem
                    id="vc-view-as-role"
                    label="View As Role"
                    action={async () => {
                        findByProps("_dispatch").dispatch({
                            "type": "IMPERSONATE_UPDATE",
                            "guildId": guild.id,
                            "data": {
                                "type": "ROLES",
                                "roles": {
                                    [role.id]: {
                                        "id": role.id,
                                        "name": role.name,
                                        "guildId": guild.id,
                                        "permissions": role.permissions,
                                        "mentionable": role.mentionable,
                                        "position": role.position,
                                        "color": role.color,
                                        "colorString": role.colorString,
                                        "colors": role.colors,
                                        "colorStrings": role.colorStrings,
                                        "hoist": role.hoist,
                                        "managed": role.managed,
                                        "tags": role.tags,
                                        "icon": role.icon,
                                        "unicodeEmoji": role.unicodeEmoji,
                                        "flags": role.flags,
                                        "description": ""
                                    }
                                },
                                "returnToSection": "ROLES",
                                "timestamp": 1770384170066
                            }
                        });
                        // await GuildSettingsActions.open(guild.id, "ROLES");
                        // GuildSettingsActions.selectRole(id);
                    }}
                    icon={OpenExternalIcon}
                />
            );
        }
    },
});


