import { FluxStore } from "..";

export class GuildAvailabilityStore extends FluxStore {
    get totalGuilds(): number;
    get totalUnavailableGuilds(): number;
    get unavailableGuilds(): string[];
    isUnavailable(guildId: string | null | undefined): boolean;
}
