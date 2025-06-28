export default interface GuildMember {
    avatar: string | undefined;
    banner: string | undefined;
    bio: string;
    colorString: string;
    communicationDisabledUntil: string | undefined;
    fullProfileLoadedTimestamp: number;
    guildId: string;
    hoistRoleId: string;
    iconRoleId: string;
    isPending: boolean | undefined;
    joinedAt: string | undefined;
    nick: string | undefined;
    premiumSince: string | undefined;
    roles: string[];
    userId: string;
}
