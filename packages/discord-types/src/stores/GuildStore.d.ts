import { Guild, FluxStore } from "..";

export class GuildStore extends FluxStore {
    /** @correctType Guild | returns undefined for invalid guildId */
    getGuild(guildId: string): Guild;
    getGuildCount(): number;
    getGuilds(): Record<string, Guild>;
    getGuildsArray(): Guild[];
    getGuildIds(): string[];
}
