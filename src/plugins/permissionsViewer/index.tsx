/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, FluxDispatcher, GuildMemberStore, GuildStore, Menu, UserStore } from "@webpack/common";
import { Guild, GuildMember, User } from "discord-types/general";

import RolesAndUsersPermissions, { PermissionType, RoleOrUserPermission } from "./components/RolesAndUsersPermissions";
import UserPermissions from "./components/UserPermissions";

export enum PermissionsSortOrder {
    HighestRole,
    LowestRole
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

enum MenuItemParentType {
    User,
    Channel
}

export default definePlugin({
    name: "PermissionsViewer",
    description: "View the permissions an user or channel has, and the roles of a server.",
    authors: [Devs.Nuckyz],
    settings,

    dependencies: ["MenuItemDeobfuscatorAPI"],

    patches: [
        {
            find: ".Messages.BOT_PROFILE_SLASH_COMMANDS",
            replacement: {
                match: /(?<=guild:(?<guild>\i),guildMember:(?<guildMember>\i),showBorder:.{0,60}}\),)/,
                replace: "$self.UserPermissions($<guild>,$<guildMember>),",
            },
        },
        {
            find: ".Messages.STAGE_CHANNEL_USER_MOVE_TO_AUDIENCE",
            replacement: {
                match: /var (?<user>\i)=\i\.user,(?<guildId>\i)=\i\.guildId.+?\.GUILD_CHANNEL_USER_MENU]\)/,
                replace: (mod, user, guildId) => {
                    const rolesItem = mod.match(RegExp(`(?<=,).{1,2}(?==\\(0,.{1,2}\\..{1,2}\\)\\(${user}\\.id,${guildId}\\))`));

                    if (rolesItem) {
                        mod = mod.replace(RegExp(`(?<=children:\\[${rolesItem[0]},.{0,10})(?=\\])`), `,Vencord.Plugins.plugins.PermissionsViewer.MenuItem(${guildId},${user}.id,${MenuItemParentType.User})`);
                    }

                    return mod;
                }
            }
        },
        {
            find: "GuildContextMenu: user cannot be undefined",
            replacement: {
                match: /(?<=null:\i,)(?=.{0,80}\.Messages\.PRIVACY_SETTINGS.+?guild:(?<guild>\i)})/,
                replace: "$self.MenuItem($<guild>.id),"
            }
        },
        ...[
            ".CHANNEL_LIST_VOICE_CHANNEL_MENU]",
            ".CHANNEL_LIST_TEXT_CHANNEL_MENU]",
            ".CHANNEL_CATEGORY_MENU]"
        ].map(find => ({
            find,
            replacement: {
                match: /(?<=var (?<channel>\i)=\i\.channel,(?<guild>\i)=\i\.guild.+?children:\[)(?=.{0,30}"notifications")/,
                replace: `$self.MenuItem($<guild>.id,$<channel>.id,${MenuItemParentType.Channel}),`
            }
        }))
    ],

    UserPermissions: (guild: Guild, guildMember: GuildMember) => <UserPermissions guild={guild} guildMember={guildMember} />,

    MenuItem(guildId: string, id?: string, type?: MenuItemParentType) {
        const guild = GuildStore.getGuild(guildId);

        const permissions: Array<RoleOrUserPermission> = [];
        let header: string;

        switch (type) {
            case MenuItemParentType.User: {
                const guildMember = GuildMemberStore.getMember(guildId, id!);

                const roles = [...guildMember.roles.map(roleId => guild.roles[roleId]), guild.roles[guild.id]];
                roles.sort(({ position: a }, { position: b }) => b - a);

                for (const role of roles) {
                    permissions.push({
                        type: PermissionType.Role,
                        id: role.id,
                        permissions: role.permissions
                    });
                }

                header = guildMember.nick ?? UserStore.getUser(guildMember.userId).username;

                break;
            }
            case MenuItemParentType.Channel: {
                const channel = ChannelStore.getChannel(id!);

                Object.values(channel.permissionOverwrites).forEach(overwrite => {
                    permissions.push({
                        type: overwrite.type as PermissionType,
                        id: overwrite.id,
                        overwriteAllow: overwrite.allow,
                        overwriteDeny: overwrite.deny
                    });
                });

                header = channel.name;

                break;
            }
            default: {
                Object.values(guild.roles).forEach(role => {
                    permissions.push({
                        type: PermissionType.Role,
                        id: role.id,
                        permissions: role.permissions
                    });
                });

                header = guild.name;

                break;
            }
        }

        return (
            <Menu.MenuItem
                id="perm-viewer-permissions"
                key="perm-viewer-permissions"
                label="Permissions"
                action={async () => {
                    const usersChunks: Array<Array<string>> = [];

                    for (const permission of permissions) {
                        if (permission.type === PermissionType.User) {
                            if (!UserStore.getUser(permission.id)) {
                                const currentChunk = usersChunks[usersChunks.length - 1] ?? [];
                                if (currentChunk.length < 100) {
                                    currentChunk.push(permission.id);

                                    if (usersChunks.length) {
                                        usersChunks[usersChunks.length - 1] = currentChunk;
                                    } else usersChunks.push(currentChunk);
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
                }}
            />

        );
    }
});
