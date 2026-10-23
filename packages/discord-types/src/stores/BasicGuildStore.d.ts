import { FluxStore, Guild } from "..";

export interface BasicGuild extends Pick<Guild, "id" | "name" | "description" | "icon" | "splash" | "features"> {
    discovery_splash: Guild["discoverySplash"];
    home_header: Guild["homeHeader"];
}

export class BasicGuildStore extends FluxStore {
    getGuild(guildId: string): BasicGuild;
    getGuildOrStatus(guildId: string): BasicGuild | { type: "loading"; } | { type: "failed"; } | undefined;
    isGuildFetching(guildId: string): boolean;
    getVersion(): number;
}
