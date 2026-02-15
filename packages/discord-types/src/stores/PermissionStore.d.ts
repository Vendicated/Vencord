import { Channel, Guild, Role, FluxStore } from "..";

export interface GuildPermissionProps {
    canManageGuild: boolean;
    canManageChannels: boolean;
    canManageRoles: boolean;
    canManageBans: boolean;
    canManageNicknames: boolean;
    canManageGuildExpressions: boolean;
    canViewAuditLog: boolean;
    canViewAuditLogV2: boolean;
    canManageWebhooks: boolean;
    canViewGuildAnalytics: boolean;
    canAccessMembersPage: boolean;
    isGuildAdmin: boolean;
    isOwner: boolean;
    isOwnerWithRequiredMfaLevel: boolean;
    guild: Guild;
}

export interface PartialChannelContext {
    channelId: string;
}

export interface PartialGuildContext {
    guildId: string;
}

export type PartialContext = PartialChannelContext | PartialGuildContext;

type PartialChannel = Channel | { id: string; };
type PartialGuild = Guild | { id: string; };

export class PermissionStore extends FluxStore {
    // TODO: finish typing these
    can(permission: bigint, channelOrGuild: PartialChannel | PartialGuild, guildId?: string, overwrites?: Record<string, any>, userId?: string): boolean;
    canBasicChannel(permission: bigint, channel: PartialChannel, guildId?: string, overwrites?: Record<string, any>, userId?: string): boolean;
    canWithPartialContext(permission: bigint, context: PartialContext): boolean;
    canManageUser(permission: bigint, userOrUserId: string, guild: PartialGuild): boolean;
    canAccessGuildSettings(guild: PartialGuild): boolean;
    canAccessMemberSafetyPage(guild: PartialGuild): boolean;
    canImpersonateRole(guild: PartialGuild, role: Role): boolean;

    // TODO: finish typing
    computePermissions(channel: PartialChannel, guildId?: string, overwrites?: Record<string, any>, userId?: string): bigint;
    computeBasicPermissions(channel: PartialChannel): number;

    getChannelPermissions(channel: PartialChannel): bigint;
    getGuildPermissions(guild: PartialGuild): bigint;
    getGuildPermissionProps(guild: PartialGuild): GuildPermissionProps;

    getHighestRole(guild: PartialGuild): Role | null;
    isRoleHigher(guild: PartialGuild, firstRole: Role | null, secondRole: Role | null): boolean;

    getGuildVersion(guildId: string): number;
    getChannelsVersion(): number;
}
