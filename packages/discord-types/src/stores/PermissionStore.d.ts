/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { ChannelRecord } from "../general/channels/ChannelRecord";
import type { GuildRecord } from "../general/GuildRecord";
import type { PermissionOverwriteMap } from "../general/Permissions";
import type { Role } from "../general/Role";
import type { UserRecord } from "../general/UserRecord";
import type { Nullish } from "../internal";
import type { FluxStore } from "./abstract/FluxStore";

export type PermissionStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC" | "CACHE_LOADED" | "CACHE_LOADED_LAZY" | "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_UPDATES" | "CONNECTION_CLOSED" | "CONNECTION_OPEN" | "CURRENT_USER_UPDATE" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_FEED_FETCH_SUCCESS" | "GUILD_MEMBER_ADD" | "GUILD_MEMBER_UPDATE" | "GUILD_ROLE_CREATE" | "GUILD_ROLE_DELETE" | "GUILD_ROLE_UPDATE" | "GUILD_UPDATE" | "IMPERSONATE_STOP" | "IMPERSONATE_UPDATE" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_THREADS_SUCCESS" | "LOGOUT" | "MOD_VIEW_SEARCH_FINISH" | "OVERLAY_INITIALIZE" | "SEARCH_FINISH" | "STAGE_INSTANCE_CREATE" | "STAGE_INSTANCE_DELETE" | "STAGE_INSTANCE_UPDATE" | "THREAD_CREATE" | "THREAD_LIST_SYNC" | "THREAD_MEMBERS_UPDATE" | "THREAD_MEMBER_UPDATE" | "THREAD_UPDATE">;

export class PermissionStore<Action extends FluxAction = PermissionStoreAction> extends FluxStore<Action> {
    static displayName: "PermissionStore";

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
