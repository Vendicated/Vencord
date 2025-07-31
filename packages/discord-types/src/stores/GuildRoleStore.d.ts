import { FluxStore, Guild, Role } from "..";

// TODO: add the rest of the methods for GuildRoleStore
export class GuildRoleStore extends FluxStore {
    serializeAllGuildRoles(): Array<{ partitionKey: string; values: Record<string, Role>; }>;
    getUnsafeMutableRoles(guildId: string): Record<string, Role>;
    getManyRoles(guildId: string, roleIds: string[]): Role[];
    getRole(guildId: string, roleId: string): Role;
    getNumRoles(guildId: string): number;
    getEveryoneRole(guild: Guild): Role;
    getRolesSnapshot(guildId: string): Record<string, Role>;
    getSortedRoles(guildId: string): Role[];
}
