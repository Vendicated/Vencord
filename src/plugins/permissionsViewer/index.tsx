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

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getGuildRoles } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildMemberStore, GuildStore, Menu, PermissionsBits, UserStore } from "@webpack/common";
import type { Guild, GuildMember } from "discord-types/general";

import openRolesAndUsersPermissionsModal, { PermissionType, RoleOrUserPermission } from "./components/RolesAndUsersPermissions";
import UserPermissions from "./components/UserPermissions";
import { getSortedRoles, sortPermissionOverwrites } from "./utils";

export const enum PermissionsSortOrder {
    HighestRole,
    LowestRole
}

const enum MenuItemParentType {
    User,
    Channel,
    Guild
}

export const settings = definePluginSettings({
    permissionsSortOrder: {
        description: "The sort method used for defining which role grants an user a certain permission",
        type: OptionType.SELECT,
        options: [
            { label: "Highest Role", value: PermissionsSortOrder.HighestRole, default: true },
            { label: "Lowest Role", value: PermissionsSortOrder.LowestRole }
        ],
    },
    defaultPermissionsDropdownState: {
        description: "Whether the permissions dropdown on user popouts should be open by default",
        type: OptionType.BOOLEAN,
        default: false,
    }
});

function MenuItem(guildId: string, id?: string, type?: MenuItemParentType) {
    if (type === MenuItemParentType.User && !GuildMemberStore.isMember(guildId, id!)) return null;

    return (
        <Menu.MenuItem
            id="perm-viewer-permissions"
            label="Permissions"
            action={() => {
                const guild = GuildStore.getGuild(guildId);

                let permissions: RoleOrUserPermission[];
                let header: string;

                switch (type) {
                    case MenuItemParentType.User: {
                        const member = GuildMemberStore.getMember(guildId, id!);

                        permissions = getSortedRoles(guild, member)
                            .map(role => ({
                                type: PermissionType.Role,
                                ...role
                            }));

                        if (guild.ownerId === id) {
                            permissions.push({
                                type: PermissionType.Owner,
                                permissions: Object.values(PermissionsBits).reduce((prev, curr) => prev | curr, 0n)
                            });
                        }

                        header = member.nick ?? UserStore.getUser(member.userId).username;

                        break;
                    }

                    case MenuItemParentType.Channel: {
                        const channel = ChannelStore.getChannel(id!);

                        permissions = sortPermissionOverwrites(Object.values(channel.permissionOverwrites).map(({ id, allow, deny, type }) => ({
                            type: type as PermissionType,
                            id,
                            overwriteAllow: allow,
                            overwriteDeny: deny
                        })), guildId);

                        header = channel.name;

                        break;
                    }

                    default: {
                        permissions = Object.values(getGuildRoles(guild.id)).map(role => ({
                            type: PermissionType.Role,
                            ...role
                        }));

                        header = guild.name;

                        break;
                    }
                }

                openRolesAndUsersPermissionsModal(permissions, guild, header);
            }}
        />
    );
}

function makeContextMenuPatch(childId: string | string[], type?: MenuItemParentType): NavContextMenuPatchCallback {
    return (children, props) => {
        if (!props) return;
        if ((type === MenuItemParentType.User && !props.user) || (type === MenuItemParentType.Guild && !props.guild) || (type === MenuItemParentType.Channel && (!props.channel || !props.guild)))
            return;

        const group = findGroupChildrenByChildId(childId, children);

        const item = (() => {
            switch (type) {
                case MenuItemParentType.User:
                    return MenuItem(props.guildId, props.user.id, type);
                case MenuItemParentType.Channel:
                    return MenuItem(props.guild.id, props.channel.id, type);
                case MenuItemParentType.Guild:
                    return MenuItem(props.guild.id);
                default:
                    return null;
            }
        })();

        if (item == null) return;

        if (group)
            group.push(item);
        else if (childId === "roles" && props.guildId)
            // "roles" may not be present due to the member not having any roles. In that case, add it above "Copy ID"
            children.splice(-1, 0, <Menu.MenuGroup>{item}</Menu.MenuGroup>);
    };
}

export default definePlugin({
    name: "PermissionsViewer",
    description: "View the permissions a user or channel has, and the roles of a server",
    authors: [Devs.Nuckyz, Devs.Ven],
    settings,

    patches: [
        {
            find: ".popularApplicationCommandIds,",
            replacement: {
                match: /showBorder:(.{0,60})}\),(?<=guild:(\i),guildMember:(\i),.+?)/,
                replace: (m, showBoder, guild, guildMember) => `${m}$self.UserPermissions(${guild},${guildMember},${showBoder}),`
            }
        }
    ],

    UserPermissions: (guild: Guild, guildMember: GuildMember | undefined, showBoder: boolean) => !!guildMember && <UserPermissions guild={guild} guildMember={guildMember} showBorder={showBoder} />,

    contextMenus: {
        "user-context": makeContextMenuPatch("roles", MenuItemParentType.User),
        "channel-context": makeContextMenuPatch(["mute-channel", "unmute-channel"], MenuItemParentType.Channel),
        "guild-context": makeContextMenuPatch("privacy", MenuItemParentType.Guild),
        "guild-header-popout": makeContextMenuPatch("privacy", MenuItemParentType.Guild)
    }
});
