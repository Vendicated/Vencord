import { Guild, FluxStore } from "..";

export class GuildStore extends FluxStore {
    getGuild(guildId: string): Guild;
    getGuildCount(): number;
    getGuilds(): Record<string, Guild>;
    getGuildIds(): string[];
}
