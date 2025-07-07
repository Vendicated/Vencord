import { Guild, FluxStore } from "discord-types/general";


export class GuildStore extends FluxStore {
    getGuild(guildId: string): Guild;
    getGuildCount(): number;
    getGuilds(): Record<string, Guild>;
    getGuildIds(): string[];
}
