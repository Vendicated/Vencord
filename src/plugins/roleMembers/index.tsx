/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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
import { fetchUserProfile } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, GuildMemberStore, GuildRoleStore, GuildStore, Menu, SelectedChannelStore, UserProfileActions, UserStore } from "@webpack/common";

// import { RoleMemberPopout } from "./components";

const settings = definePluginSettings({
    showCounts: {
        type: OptionType.BOOLEAN,
        description: "Show member counts in context menu",
        default: false
    }
});

const ImageResolver = findByPropsLazy("getUserAvatarURL", "getEmojiURL");
const locale = findByPropsLazy("getLocale");

// Custom function to open guild-specific profile
async function openGuildProfile(userId: string, guildId: string) {
    try {
        console.log("MemberRoles: Fetching guild profile for", userId, "in guild", guildId);

        // First, fetch the guild profile to ensure it's loaded
        await fetchUserProfile(userId, { guild_id: guildId });

        // Small delay to ensure data is loaded
        await new Promise(resolve => setTimeout(resolve, 100));

        // Then open the profile modal with the guild context
        UserProfileActions.openUserProfileModal({
            userId: userId,
            guildId: guildId,
            channelId: SelectedChannelStore.getChannelId(),
            analyticsLocation: {
                page: "Guild Channel",
                section: "Profile Popout"
            }
        });
    } catch (error) {
        console.error("MemberRoles: Error opening guild profile:", error);
        // Fallback to global profile
        UserProfileActions.openUserProfileModal({
            userId: userId,
            guildId: null,
            channelId: SelectedChannelStore.getChannelId(),
            analyticsLocation: {
                page: "Guild Channel",
                section: "Profile Popout"
            }
        });
    }
}

// Translation function for menu labels
function t(key: string): string {
    const translations: Record<string, Record<string, string>> = {
        "VIEW_ROLE_MEMBERS": {
            "en": "View Role Members",
            "de": "Rollenmitglieder anzeigen",
            "fr": "Voir les membres du rôle",
            "es": "Ver miembros del rol",
            "it": "Visualizza membri del ruolo",
            "pt": "Ver membros da função",
            "ru": "Просмотр участников роли",
            "ja": "ロールメンバーを表示",
            "ko": "역할 멤버 보기",
            "zh": "查看角色成员",
            "nl": "Rolleden bekijken",
            "pl": "Zobacz członków roli",
            "tr": "Rol Üyelerini Görüntüle"
        }
    };

    // Try to get Discord's current locale, fallback to English
    const currentLocale = locale.getLocale?.()?.split('-')[0] || "en";
    const localeGroup = translations[key];

    if (localeGroup) {
        return localeGroup[currentLocale] || localeGroup["en"] || key;
    }

    return key;
}

function createMemberMenuItems(guildId: string, roleId: string) {
    const allMembers = GuildMemberStore.getMembers(guildId);
    const roleMembers = allMembers.filter(m => m.roles.includes(roleId));

    if (roleMembers.length === 0) {
        return [];
    }

    return roleMembers.map(member => {
        const user = UserStore.getUser(member.userId);
        if (!user) return null;

        const avatarURL = ImageResolver?.getUserAvatarURL?.(user) || "";

        return (
            <Menu.MenuItem
                key={member.userId}
                id={`vc-member-${member.userId}`}
                label={user.username}
                icon={avatarURL ? () => (
                    <img
                        src={avatarURL}
                        style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            objectFit: "cover"
                        }}
                        alt=""
                    />
                ) : undefined}
            >
                <Menu.MenuItem
                    id={`vc-member-${member.userId}-global`}
                    label="Global Profile"
                    action={() => {
                        console.log("MemberRoles: Opening global profile for", member.userId);
                        UserProfileActions.openUserProfileModal({
                            userId: member.userId,
                            guildId: null,
                            channelId: SelectedChannelStore.getChannelId(),
                            analyticsLocation: {
                                page: "DM Channel",
                                section: "Profile Popout"
                            }
                        });
                    }}
                />
                <Menu.MenuItem
                    id={`vc-member-${member.userId}-guild`}
                    label="Guild Profile"
                    action={() => {
                        console.log("MemberRoles: Opening guild profile for", member.userId, "in guild", guildId);
                        openGuildProfile(member.userId, guildId);
                    }}
                />
            </Menu.MenuItem>
        );
    }).filter(Boolean);
}

function showRolePopout(guildId: string, roleId: string) {
    const guild = GuildStore.getGuild(guildId);
    const roles = GuildRoleStore.getRolesSnapshot(guildId);

    if (!guild || !roles) return;

    const role = roles[roleId];
    if (!role) return;

    const allMembers = GuildMemberStore.getMembers(guildId);
    const roleMembers = allMembers.filter(m => m.roles.includes(roleId));

    const members = roleMembers.map(member => {
        const user = UserStore.getUser(member.userId);
        return {
            userId: member.userId,
            username: user?.username || "Unknown User",
            avatarURL: ImageResolver?.getUserAvatarURL?.(user) || ""
        };
    });

    // Show role popout as fallback for direct action (e.g., role mention clicks)
    console.log(`Opening role popout for role ${role.name} with ${members.length} members`);

    // For now, just open the user profile of the first member as a fallback
    // Default to global profile
    if (members.length > 0) {
        UserProfileActions.openUserProfileModal({
            userId: members[0].userId,
            guildId: null, // null = global profile
            channelId: SelectedChannelStore.getChannelId(),
            analyticsLocation: {
                page: "Guild Channel",
                section: "Profile Popout"
            }
        });
    }
}

function createRoleMenuItems(guild: any) {
    const sortedRoles = GuildRoleStore.getSortedRoles(guild.id);

    return sortedRoles
        .filter(role => role.name !== "@everyone")
        .map(role => {
            const members = GuildMemberStore.getMembers(guild.id);
            const roleMembers = members.filter(m => m.roles.includes(role.id));
            const memberCount = roleMembers.length;

            let label = role.name;
            if (settings.store.showCounts) {
                label = `${label} (${memberCount})`;
            }

            // If no members in role, create a disabled menu item (no submenu)
            if (memberCount === 0) {
                return (
                    <Menu.MenuItem
                        key={role.id}
                        id={`vc-role-${role.id}-empty`}
                        label={label}
                        style={{
                            color: role.colorString || "var(--text-muted)",
                            opacity: 0.6
                        }}
                        disabled={true}
                    />
                );
            }

            // If members exist, create submenu with proper role color
            return (
                <Menu.MenuItem
                    key={role.id}
                    id={`vc-role-${role.id}`}
                    label={label}
                    style={{
                        color: role.colorString || "var(--text-normal)"
                    }}
                >
                    {createMemberMenuItems(guild.id, role.id)}
                </Menu.MenuItem>
            );
        });
}

const guildContextMenuPatch: NavContextMenuPatchCallback = (children, { guild }) => {
    console.log("MemberRoles: Guild context menu patch called", { guild, children });

    if (!guild) {
        console.log("MemberRoles: No guild found");
        return;
    }

    // Check if roles exist using GuildRoleStore
    const roles = GuildRoleStore.getRolesSnapshot(guild.id);
    if (!roles || Object.keys(roles).length === 0) {
        console.log("MemberRoles: No roles found in guild");
        return;
    }

    console.log("MemberRoles: Found roles:", Object.keys(roles).length);

    // Try to find the privacy group first
    let group = findGroupChildrenByChildId("privacy", children);
    console.log("MemberRoles: Privacy group found:", !!group);

    // If privacy group doesn't exist, try other common groups
    if (!group) {
        group = findGroupChildrenByChildId("guild-settings", children);
        console.log("MemberRoles: Guild settings group found:", !!group);
    }

    // If still no group found, add to the end with submenu
    if (!group) {
        console.log("MemberRoles: No group found, adding to end with submenu");
        children.push(
            <Menu.MenuItem
                id="vc-role-members"
                label={t("VIEW_ROLE_MEMBERS")}
            >
                {createRoleMenuItems(guild)}
            </Menu.MenuItem>
        );
        return;
    }

    // Add to the found group with submenu
    console.log("MemberRoles: Adding to group with submenu");
    group.push(
        <Menu.MenuItem
            id="vc-role-members"
            label={t("VIEW_ROLE_MEMBERS")}
        >
            {createRoleMenuItems(guild)}
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "RoleMembers",
    description: "View role members by right-clicking on a server in the context menu or clicking on role mentions",
    authors: [
        Devs.Zerebos,
        Devs.Justman10000
    ],
    settings,

    patches: [
        // Make role mentions clickable
        {
            find: "role mention",
            replacement: {
                match: /(\.mention\.role.*?)(,children:)/,
                replace: "$1,className:$self.addInteractiveClass(arguments[0]),onClick:$self.handleRoleMentionClick$2"
            },
            noWarn: true
        }
    ],

    contextMenus: {
        "guild-context": guildContextMenuPatch
    },

    addInteractiveClass(props: any) {
        if (props?.className?.includes?.("mention") && props?.className?.includes?.("role")) {
            return props.className + " interactive";
        }
        return props?.className || "";
    },

    handleRoleMentionClick(event: MouseEvent, props: any) {
        try {
            const channelId = SelectedChannelStore.getChannelId();
            const channel = ChannelStore.getChannel(channelId);
            const guildId = channel?.guild_id;

            if (!guildId) return;

            const guild = GuildStore.getGuild(guildId);
            const roles = GuildRoleStore.getRolesSnapshot(guildId);
            if (!guild || !roles) return;

            // Extract role name from the mention
            const roleName = props?.children?.[1]?.[0]?.props?.children?.slice(1);
            if (!roleName) return;

            // Find role by name
            const role = Object.values(roles).find((r: any) => r.name === roleName);
            if (!role) return;

            showRolePopout(guildId, (role as any).id);
        } catch (error) {
            console.error("MemberRoles: Error handling role mention click:", error);
        }
    }
});