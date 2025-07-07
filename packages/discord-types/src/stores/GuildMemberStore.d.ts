import { FluxStore, GuildMember } from "..";

export class GuildMemberStore extends FluxStore {
    getAllGuildsAndMembers(): Record<string, Record<string, GuildMember>>;
    /** @returns Format: [guildId-userId: Timestamp (string)] */
    getCommunicationDisabledUserMap(): Record<string, string>;
    getCommunicationDisabledVersion(): number;
    getKeyedMembers(guildId: string): Record<string, GuildMember>;
    getMember(guildId: string, userId: string): GuildMember;
    getMemberIds(guildId: string): string[];
    getMembers(guildId: string): GuildMember[];
    /**
     * if any inputs are nullish, returns null
     */
    getNick(guildId: string | undefined | null, userId: string | undefined | null): string | null;
    getNicknameGuildsMapping(userId: string): Record<string, string[]>;
    getNicknames(userId: string): string[];
    isMember(guildId: string, userId: string): boolean;
    memberOf(userId: string): string[];
    initialize(): void;
}
