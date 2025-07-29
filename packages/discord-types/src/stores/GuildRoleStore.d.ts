import { FluxStore, Role } from "..";

// TODO: add the rest of the methods for GuildRoleStore
export class GuildRoleStore extends FluxStore {
    getRole(guildId: string, roleId: string): Role;
    /**
     * Prefer {@link getSortedRoles} to this
     *
     * @see {@link getSortedRoles}
     */
    getUnsafeMutableRoles(guildId: string): Record<string, Role>;
    getSortedRoles(guildId: string): Role[];
}
