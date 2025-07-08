export interface GuildMember {
    avatar: string | undefined;
    avatarDecoration: string | undefined;
    banner: string | undefined;
    bio: string;
    colorRoleId: string | undefined;
    colorString: string;
    colorStrings: {
        primaryColor: string | undefined;
        secondaryColor: string | undefined;
        tertiaryColor: string | undefined;
    };
    communicationDisabledUntil: string | undefined;
    flags: number;
    fullProfileLoadedTimestamp: number;
    guildId: string;
    highestRoleId: string;
    hoistRoleId: string;
    iconRoleId: string;
    isPending: boolean | undefined;
    joinedAt: string | undefined;
    nick: string | undefined;
    premiumSince: string | undefined;
    roles: string[];
    userId: string;
}
