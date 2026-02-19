import { FluxStore, Guild, Role } from "..";

export class GuildRoleStore extends FluxStore {
    getRolesSnapshot(guildId: string): Record<string, Role>;
    getSortedRoles(guildId: string): Role[];

    getEveryoneRole(guild: Guild): Role;
    getManyRoles(guildId: string, roleIds: string[]): Role[];
    getNumRoles(guildId: string): number;
    getRole(guildId: string, roleId: string): Role;
    getUnsafeMutableRoles(guildId: string): Record<string, Role>;
    serializeAllGuildRoles(): Array<{ partitionKey: string; values: Record<string, Role>; }>;
}
