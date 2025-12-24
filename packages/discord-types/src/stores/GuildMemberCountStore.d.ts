import { FluxStore } from "..";

export class GuildMemberCountStore extends FluxStore {
    getMemberCounts(): Record<string, number>;
    getMemberCount(guildId: string): number | undefined;
    getOnlineCount(guildId: string): number | undefined;
}
