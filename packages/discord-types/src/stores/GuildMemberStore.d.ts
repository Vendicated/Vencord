import { FluxStore, GuildMember } from "..";

export class GuildMemberStore extends FluxStore {
    /** @returns Format: [guildId-userId: Timestamp (string)] */
    getCommunicationDisabledUserMap(): Record<string, string>;
    getCommunicationDisabledVersion(): number;

    getMutableAllGuildsAndMembers(): Record<string, Record<string, GuildMember>>;

    getMember(guildId: string, userId: string): GuildMember | null;
    getTrueMember(guildId: string, userId: string): GuildMember | null;
    getMemberIds(guildId: string): string[];
    getMembers(guildId: string): GuildMember[];

    getCachedSelfMember(guildId: string): GuildMember | null;
    getSelfMember(guildId: string): GuildMember | null;
    getSelfMemberJoinedAt(guildId: string): Date | null;

    getNick(guildId: string, userId: string): string | null;
    getNicknameGuildsMapping(userId: string): Record<string, string[]>;
    getNicknames(userId: string): string[];

    isMember(guildId: string, userId: string): boolean;
    isMember(guildId: string, userId: string): boolean;
    isGuestOrLurker(guildId: string, userId: string): boolean;
    isCurrentUserGuest(guildId: string): boolean;
}
