/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";
import type { ChannelRecord } from "../general/channels/ChannelRecord";
import type { GuildRecord } from "../general/GuildRecord";
import type { PermissionOverwriteMap } from "../general/Permissions";
import type { Role } from "../general/Role";
import type { UserRecord } from "../general/UserRecord";
import type { Nullish } from "../internal";

export declare class PermissionStore extends Store {
    static displayName: "PermissionStore";

    /** Always returns false for private (non-guild) channels. */
    can(
        permissions: /* Permissions */ bigint,
        context?: GuildRecord | ChannelRecord | Nullish,
        overwrites?: PermissionOverwriteMap | Nullish,
        roles?: { [roleId: string]: Role; } | Nullish,
        excludeGuildPermissions?: boolean | undefined /* = false */
    ): boolean;
    canAccessGuildSettings(guild: GuildRecord): boolean;
    canAccessMemberSafetyPage(guild: GuildRecord): boolean;
    canBasicChannel<Context extends BasicPermissionsObject | GuildRecord | ChannelRecord>(
        permissions: Context extends BasicPermissionsObject ? /* Permissions */ bigint : Parameters<BigIntConstructor>[0],
        context: Context,
        overwrites?: PermissionOverwriteMap | Nullish,
        roles?: { [roleId: string]: Role; } | Nullish,
        excludeGuildPermissions?: boolean | undefined /* = false */
    ): boolean;
    canImpersonateRole(guild: GuildRecord, role: Role): boolean;
    canManageUser(
        permissions: /* Permissions */ bigint,
        userOrUserId: UserRecord | string,
        guild: GuildRecord
    ): boolean;
    canWithPartialContext(
        context: { guildId: string; } | { channelId: string; },
        permissions: /* Permissions */ bigint
    ): boolean;
    computeBasicPermissions(context: BasicPermissionsObject): /* Permissions */ bigint;
    computePermissions(
        context?: GuildRecord | ChannelRecord | Nullish,
        overwrites?: PermissionOverwriteMap | Nullish,
        roles?: { [roleId: string]: Role; } | Nullish,
        excludeGuildPermissions?: boolean | undefined /* = false */
    ): /* Permissions */ bigint;
    getChannelPermissions(channel: ChannelRecord): /* Permissions */ bigint;
    getChannelsVersion(): number;
    getGuildPermissionProps(guild: GuildRecord): {
        canAccessMembersPage: boolean;
        canManageBans: boolean;
        canManageChannels: boolean;
        canManageGuild: boolean;
        canManageGuildExpressions: boolean;
        canManageNicknames: boolean;
        canManageRoles: boolean;
        canManageWebhooks: boolean;
        canViewAuditLog: boolean;
        canViewAuditLogV2: boolean;
        canViewGuildAnalytics: boolean;
        guild: GuildRecord;
        isGuildAdmin: boolean;
        isOwner: boolean;
        isOwnerWithRequiredMfaLevel: boolean;
    };
    getGuildPermissions(guild: GuildRecord): /* Permissions */ bigint;
    getGuildVersion(guildId: string): number;
    getHighestRole(guild: GuildRecord): Role;
    initialize(): void;
    isRoleHigher(guild: GuildRecord, roleA: Role, roleB: Role): boolean;
}

export interface BasicPermissionsObject {
    basicPermissions: bigint;
}
