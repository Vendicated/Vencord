import { Guild, FluxStore } from "..";

export class GuildStore extends FluxStore {
    getGuild(guildId: string): Guild | undefined;
    getGuildCount(): number;
    getGuilds(): Record<string, Guild>;
    getGuildsArray(): Guild[];
    getGuildIds(): string[];
}
