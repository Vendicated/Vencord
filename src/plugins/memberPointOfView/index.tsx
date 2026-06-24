/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Channel, Role, User } from "@vencord/discord-types";
import { FluxDispatcher, GuildMemberStore, GuildRoleStore, GuildStore, Menu, PermissionStore, showToast, Toasts } from "@webpack/common";

interface UserContextProps {
    channel?: Channel;
    guildId?: string;
    user?: User;
}

function ViewAsMemberIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 4.5c-5.2 0-9.3 4.4-10.7 6.2a2.1 2.1 0 0 0 0 2.6C2.7 15.1 6.8 19.5 12 19.5s9.3-4.4 10.7-6.2a2.1 2.1 0 0 0 0-2.6C21.3 8.9 17.2 4.5 12 4.5Zm0 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm0-2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        </svg>
    );
}

function getMemberRoleMap(guildId: string, userId: string): Record<string, Role> | null {
    const member = GuildMemberStore.getMember(guildId, userId);
    if (!member) return null;

    const roles = {} as Record<string, Role>;
    for (const roleId of member.roles) {
        const role = GuildRoleStore.getRole(guildId, roleId);
        if (role) roles[roleId] = role;
    }

    return roles;
}

function openMemberPointOfView(guildId: string, user: User) {
    const roles = getMemberRoleMap(guildId, user.id);
    if (!roles) {
        showToast("This user is not a member of the current server.", Toasts.Type.FAILURE);
        return;
    }

    FluxDispatcher.dispatch({
        type: "IMPERSONATE_UPDATE",
        guildId,
        data: {
            type: "ROLES",
            roles
        }
    });

    showToast(`Viewing server as ${user.username}`, Toasts.Type.SUCCESS);
}

const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { guildId, user }: UserContextProps) => {
    if (!guildId || !user) return;

    const guild = GuildStore.getGuild(guildId);
    if (!guild || !PermissionStore.getGuildPermissionProps(guild).canManageRoles) return;

    children.push(
        <Menu.MenuItem
            id="vc-member-point-of-view"
            label="Server Point of View"
            action={() => openMemberPointOfView(guildId, user)}
            icon={ViewAsMemberIcon}
        />
    );
};

export default definePlugin({
    name: "MemberPointOfView",
    description: "View a server from the point of view of a selected member's roles.",
    authors: [Devs.Mashiro],
    tags: ["Servers", "Roles", "Utility"],

    contextMenus: {
        "user-context": UserContextMenuPatch
    }
});
