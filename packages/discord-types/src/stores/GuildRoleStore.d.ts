import { FluxStore, Role } from "..";

// TODO: add the rest of the methods for GuildRoleStore
export class GuildRoleStore extends FluxStore {
    getRole(guildId: string, roleId: string): Role;
}
