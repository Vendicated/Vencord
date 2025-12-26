import { FluxStore } from "..";

export class GuildMemberCountStore extends FluxStore {
    getMemberCounts(): Record<string, number>;
    getMemberCount(guildId: string): number;
    getOnlineCount(guildId: string): number;
}
