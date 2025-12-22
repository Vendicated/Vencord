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

type ChannelIdObject = Channel | { id: string; };
type GuildIdObject = Guild | { id: string; };

export class PermissionStore extends FluxStore {
    can(permission: bigint, channelOrGuild: ChannelIdObject | GuildIdObject, guildId?: string, overwrites?: Record<string, unknown>, userId?: string): boolean;
    canBasicChannel(permission: bigint, channel: ChannelIdObject, guildId?: string, overwrites?: Record<string, unknown>, userId?: string): boolean;
    canWithPartialContext(permission: bigint, context: PartialContext): boolean;
    canManageUser(permission: bigint, userOrUserId: string, guild: GuildIdObject): boolean;
    canAccessGuildSettings(guild: GuildIdObject): boolean;
    canAccessMemberSafetyPage(guild: GuildIdObject): boolean;
    canImpersonateRole(guild: GuildIdObject, role: Role): boolean;

    computePermissions(channel: ChannelIdObject, guildId?: string, overwrites?: Record<string, unknown>, userId?: string): bigint;
    computeBasicPermissions(channel: ChannelIdObject): number;

    getChannelPermissions(channel: ChannelIdObject): bigint;
    getGuildPermissions(guild: GuildIdObject): bigint;
    getGuildPermissionProps(guild: GuildIdObject): GuildPermissionProps;

    getHighestRole(guild: GuildIdObject): Role | null;
    isRoleHigher(guild: GuildIdObject, firstRole: Role | null, secondRole: Role | null): boolean;

    getGuildVersion(guildId: string): number;
    getChannelsVersion(): number;
}
