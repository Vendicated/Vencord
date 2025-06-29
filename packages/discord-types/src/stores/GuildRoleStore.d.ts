import { FluxStore, Role } from "..";

export class GuildRoleStore extends FluxStore {
    getRole(guildId: string, roleId: string): Role;
    getRoles(guildId: string): Record<string, Role>;
    getAllGuildRoles(): Record<string, Record<string, Role>>;
}
