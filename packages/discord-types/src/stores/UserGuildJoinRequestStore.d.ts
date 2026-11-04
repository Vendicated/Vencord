import { FluxStore, Guild } from "..";

export interface UserGuildJoinRequest {
    guildId: string;
    [key: string]: unknown;
}

export class UserGuildJoinRequestStore extends FluxStore {
    get hasFetchedRequestToJoinGuilds(): boolean;
    computeGuildIds(): string[];
    getRequest(guildId: string): UserGuildJoinRequest | undefined;
    getJoinRequestGuild(guildId: string): Guild | null;
    hasJoinRequestCoackmark(): boolean;
}
